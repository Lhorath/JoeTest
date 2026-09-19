import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import {
  Role,
  AccountStatus,
  BanScope,
  AdminUserFilterDto,
  AdminUserSummary,
  AdminUserDetail,
} from "@platform/types";
import { MediaProcessingQueueService } from "../tracks/media-processing-queue.service";
import { AdminAuditLogsService } from "./admin-audit-logs.service";

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly mediaProcessingQueue: MediaProcessingQueueService,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  async getUsers(filter: AdminUserFilterDto = {}): Promise<{
    items: AdminUserSummary[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (filter.search) {
      where.OR = [
        { email: { contains: filter.search, mode: "insensitive" } },
        { username: { contains: filter.search, mode: "insensitive" } },
        { displayName: { contains: filter.search, mode: "insensitive" } },
      ];
    }
    if (filter.role) {
      where.roleAssignments = { some: { role: filter.role as Role } };
    }
    if (filter.accountStatus) {
      where.accountStatus = filter.accountStatus as AccountStatus;
    }
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: {
          roleAssignments: true,
          _count: {
            select: { submissions: true, artistIdentities: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const items: AdminUserSummary[] = users.map((u) => {
      const roles = (u.roleAssignments.map((ra) => ra.role) as Role[]) || [Role.USER];
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        roles,
        accountStatus: u.accountStatus as AccountStatus,
        emailVerified: u.emailVerified,
        isHost: u.isHost,
        isAdmin: u.isAdmin || roles.includes(Role.OWNER_ADMIN),
        submissionCount: u._count.submissions,
        artistIdentityCount: u._count.artistIdentities,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      };
    });

    return { items, total, page, limit };
  }

  async getUser(id: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: true,
        profile: true,
        artistIdentities: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
        submissions: {
          take: 10,
          orderBy: { submittedAt: "desc" },
          include: {
            trackSnapshot: true,
            liveSession: {
              include: { station: { select: { stationName: true } } },
            },
          },
        },
        sessions: {
          where: { revokedAt: null, absoluteExpiresAt: { gt: new Date() } },
          orderBy: { lastSeenAt: "desc" },
        },
        securityEvents: {
          take: 10,
          orderBy: { timestamp: "desc" },
        },
        _count: {
          select: { submissions: true, artistIdentities: true },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    const roles = (user.roleAssignments.map((ra) => ra.role) as Role[]) || [Role.USER];

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      roles,
      accountStatus: user.accountStatus as AccountStatus,
      emailVerified: user.emailVerified,
      isHost: user.isHost,
      isAdmin: user.isAdmin || roles.includes(Role.OWNER_ADMIN),
      submissionCount: user._count.submissions,
      artistIdentityCount: user._count.artistIdentities,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      bio: user.profile?.biography || null,
      country: user.profile?.country || null,
      artistIdentities: user.artistIdentities.map((a) => ({
        id: a.id,
        artistName: a.artistName,
        spotifyUrl: a.spotifyUrl,
        isDefault: a.isDefault,
        createdAt: a.createdAt.toISOString(),
      })),
      recentSubmissions: user.submissions.map((s) => ({
        id: s.id,
        songName: s.trackSnapshot?.songName || "Untitled",
        artistName: s.trackSnapshot?.artistName || "Unknown Artist",
        stationName: s.liveSession?.station?.stationName || "Station",
        status: s.currentQueueStatus,
        isPriority: s.isPriority,
        submittedAt: s.submittedAt.toISOString(),
      })),
      activeSessions: user.sessions.map((sess) => ({
        id: sess.id,
        ipAddress: sess.ipAddress || undefined,
        userAgent: sess.userAgent || undefined,
        createdAt: sess.createdAt.toISOString(),
        lastSeenAt: sess.lastSeenAt.toISOString(),
      })),
      securityLogs: user.securityEvents.map((evt) => ({
        id: evt.id,
        eventType: evt.eventType,
        ipAddress: evt.ipAddress || undefined,
        createdAt: evt.timestamp.toISOString(),
      })),
    };
  }

  /**
   * Suspend a user. Enforces strict boundary: MODERATOR cannot manage OWNER_ADMIN accounts!
   */
  async suspendUser(
    targetUserId: string,
    adminUserId: string,
    actingUserRoles: Role[],
    reason: string,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { roleAssignments: true },
    });
    if (!targetUser) throw new NotFoundException("User not found");

    const targetRoles = targetUser.roleAssignments.map((ra) => ra.role);
    if (
      targetRoles.includes(Role.OWNER_ADMIN) &&
      !actingUserRoles.includes(Role.OWNER_ADMIN)
    ) {
      throw new ForbiddenException(
        "Moderator cannot manage or suspend OWNER_ADMIN accounts",
      );
    }

    const previousStatus = targetUser.accountStatus;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { accountStatus: AccountStatus.SUSPENDED },
      });

      // Revoke all active sessions
      await tx.userSession.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: reason },
      });

      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "USER_SUSPENDED",
        targetEntityType: "User",
        targetEntityId: targetUserId,
        beforeState: { accountStatus: previousStatus },
        afterState: { accountStatus: AccountStatus.SUSPENDED },
        reason,
      });
    });

    return { success: true, message: "User suspended and sessions revoked" };
  }

  async unsuspendUser(
    targetUserId: string,
    adminUserId: string,
    actingUserRoles: Role[],
    reason: string,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { roleAssignments: true },
    });
    if (!targetUser) throw new NotFoundException("User not found");

    const targetRoles = targetUser.roleAssignments.map((ra) => ra.role);
    if (
      targetRoles.includes(Role.OWNER_ADMIN) &&
      !actingUserRoles.includes(Role.OWNER_ADMIN)
    ) {
      throw new ForbiddenException(
        "Moderator cannot manage or unsuspend OWNER_ADMIN accounts",
      );
    }

    const previousStatus = targetUser.accountStatus;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { accountStatus: AccountStatus.ACTIVE },
      });

      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "USER_UNSUSPENDED",
        targetEntityType: "User",
        targetEntityId: targetUserId,
        beforeState: { accountStatus: previousStatus },
        afterState: { accountStatus: AccountStatus.ACTIVE },
        reason,
      });
    });

    return { success: true, message: "User unsuspended successfully" };
  }

  async revokeUserSessions(
    targetUserId: string,
    adminUserId: string,
    actingUserRoles: Role[],
    reason: string,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { roleAssignments: true },
    });
    if (!targetUser) throw new NotFoundException("User not found");

    const targetRoles = targetUser.roleAssignments.map((ra) => ra.role);
    if (
      targetRoles.includes(Role.OWNER_ADMIN) &&
      !actingUserRoles.includes(Role.OWNER_ADMIN)
    ) {
      throw new ForbiddenException(
        "Moderator cannot manage OWNER_ADMIN accounts",
      );
    }

    const revoked = await this.prisma.userSession.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date(), revocationReason: reason },
    });

    await this.auditLogsService.logAction({
      actingAdminUserId: adminUserId,
      actionType: "USER_SESSIONS_REVOKED",
      targetEntityType: "User",
      targetEntityId: targetUserId,
      afterState: { revokedCount: revoked.count },
      reason,
    });

    return {
      success: true,
      message: `Revoked ${revoked.count} active sessions for user`,
    };
  }

  async banUser(
    targetUserId: string,
    adminUserId: string,
    reasonCode: string,
    internalReason: string,
    userVisibleReason: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException("User not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { accountStatus: AccountStatus.BANNED },
      });

      await tx.ban.create({
        data: {
          id: generateUuidV7(),
          targetUserId,
          scope: BanScope.FULL_PLATFORM,
          reasonCode,
          internalReason,
          userVisibleReason,
          isPermanent: true,
          isActive: true,
          creatingAdminUserId: adminUserId,
        },
      });

      await tx.userSession.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: internalReason },
      });

      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "USER_BANNED",
        targetEntityType: "User",
        targetEntityId: targetUserId,
        reason: internalReason,
      });
    });

    // Enqueue storage cleanup
    await this.mediaProcessingQueue.enqueueDeleteUserMedia({
      ownerUserId: targetUserId,
    });

    return { success: true };
  }

  async deleteUser(targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException("User not found");

    // Soft delete user record and enqueue storage cleanup
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          accountStatus: AccountStatus.DEACTIVATED,
          deletedAt: new Date(),
        },
      });

      await tx.userSession.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: "Administrative account deletion" },
      });
    });

    // Enqueue storage cleanup
    await this.mediaProcessingQueue.enqueueDeleteUserMedia({
      ownerUserId: targetUserId,
    });

    return { success: true };
  }
}
