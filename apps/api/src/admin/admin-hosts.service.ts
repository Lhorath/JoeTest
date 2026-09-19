import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import {
  AdminHostFilterDto,
  AdminHostSummary,
  HostApplicationStatus,
} from "@platform/types";
import { AdminAuditLogsService } from "./admin-audit-logs.service";

@Injectable()
export class AdminHostsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  async getHosts(filter: AdminHostFilterDto = {}): Promise<{
    items: AdminHostSummary[];
    total: number;
  }> {
    const where: any = {};

    if (filter.status) {
      where.hostApplications = { some: { status: filter.status } };
    }

    if (filter.search) {
      where.OR = [
        { username: { contains: filter.search, mode: "insensitive" } },
        { displayName: { contains: filter.search, mode: "insensitive" } },
        { email: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const hosts = await this.prisma.user.findMany({
      where: {
        OR: [{ isHost: true }, { hostProfile: { isNot: null } }, { hostApplications: { some: {} } }],
        ...where,
      },
      include: {
        hostProfile: {
          include: {
            stations: true,
            payoutAccounts: {
              where: { isPrimary: true },
              take: 1,
            },
            earnings: true,
          },
        },
        hostApplications: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: AdminHostSummary[] = hosts.map((u) => {
      const profile = u.hostProfile;
      const latestApp = u.hostApplications[0];
      const payout = profile?.payoutAccounts[0];
      const station = profile?.stations[0];

      const chargesEnabled = payout?.chargesEnabled || false;
      const payoutsEnabled = payout?.payoutsEnabled || false;
      const detailsSubmitted = payout?.onboardingState === "COMPLETED";

      const totalEarningsCents = (profile?.earnings || []).reduce(
        (sum, e) => sum + (e.grossAmountCents || 0),
        0,
      );

      return {
        id: profile?.id || u.id,
        userId: u.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        stationId: station?.id || null,
        stationName: station?.stationName || null,
        stationHostname: station?.slug || null,
        applicationStatus: latestApp?.status || (u.isHost ? "APPROVED" : "NONE"),
        isSuspended: Boolean(profile?.suspendedAt),
        isLive: false,
        stripeConnect: {
          chargesEnabled,
          payoutsEnabled,
          detailsSubmitted,
          providerAccountId: payout?.providerAccountId || null,
        },
        totalEarningsCents,
        createdAt: u.createdAt.toISOString(),
      };
    });

    return { items, total: items.length };
  }

  async approveHost(applicationId: string, adminUserId: string) {
    const app = await this.prisma.hostApplication.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });
    if (!app) throw new NotFoundException("Host application not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.hostApplication.update({
        where: { id: applicationId },
        data: {
          status: HostApplicationStatus.APPROVED,
        },
      });

      await tx.hostApplicationReview.create({
        data: {
          id: generateUuidV7(),
          applicationId,
          reviewerUserId: adminUserId,
          decision: "APPROVED",
          internalNotes: "Approved by administrator",
        },
      });

      await tx.user.update({
        where: { id: app.applicantUserId },
        data: { isHost: true },
      });

      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "HOST_APPLICATION_APPROVED",
        targetEntityType: "HostApplication",
        targetEntityId: applicationId,
        reason: "Approved by administrator",
      });
    });

    return { success: true, message: "Host application approved" };
  }

  async rejectHost(applicationId: string, adminUserId: string, reason: string) {
    const app = await this.prisma.hostApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) throw new NotFoundException("Host application not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.hostApplication.update({
        where: { id: applicationId },
        data: {
          status: HostApplicationStatus.REJECTED,
        },
      });

      await tx.hostApplicationReview.create({
        data: {
          id: generateUuidV7(),
          applicationId,
          reviewerUserId: adminUserId,
          decision: "REJECTED",
          internalNotes: reason,
          userVisibleNotes: reason,
        },
      });

      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "HOST_APPLICATION_REJECTED",
        targetEntityType: "HostApplication",
        targetEntityId: applicationId,
        reason,
      });
    });

    return { success: true, message: "Host application rejected" };
  }

  async suspendHost(hostProfileId: string, adminUserId: string, reason: string) {
    const profile = await this.prisma.hostProfile.findUnique({
      where: { id: hostProfileId },
    });
    if (!profile) throw new NotFoundException("Host profile not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.hostProfile.update({
        where: { id: hostProfileId },
        data: { suspendedAt: new Date() },
      });

      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "HOST_SUSPENDED",
        targetEntityType: "HostProfile",
        targetEntityId: hostProfileId,
        reason,
      });
    });

    return { success: true, message: "Host suspended successfully" };
  }

  async reinstateHost(hostProfileId: string, adminUserId: string, reason: string) {
    const profile = await this.prisma.hostProfile.findUnique({
      where: { id: hostProfileId },
    });
    if (!profile) throw new NotFoundException("Host profile not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.hostProfile.update({
        where: { id: hostProfileId },
        data: { suspendedAt: null },
      });

      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "HOST_REINSTATED",
        targetEntityType: "HostProfile",
        targetEntityId: hostProfileId,
        reason,
      });
    });

    return { success: true, message: "Host reinstated successfully" };
  }
}
