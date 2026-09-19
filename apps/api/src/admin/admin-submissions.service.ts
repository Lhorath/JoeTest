import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import {
  QueueStatus,
  AdminSubmissionFilterDto,
  AdminSubmissionSummary,
  AdminSubmissionDetail,
  AdminSubmissionActionDto,
} from "@platform/types";
import { AdminAuditLogsService } from "./admin-audit-logs.service";

@Injectable()
export class AdminSubmissionsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  async getSubmissions(filter: AdminSubmissionFilterDto = {}): Promise<{
    items: AdminSubmissionSummary[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.submissionId) {
      where.id = filter.submissionId;
    }
    if (filter.stationId) {
      where.liveSession = { stationId: filter.stationId };
    }
    if (filter.hostId) {
      where.liveSession = { hostId: filter.hostId };
    }
    if (filter.liveSessionId) {
      where.liveSessionId = filter.liveSessionId;
    }
    if (filter.queueStatus) {
      where.currentQueueStatus = filter.queueStatus as QueueStatus;
    }
    if (filter.isPriority !== undefined) {
      where.isPriority = filter.isPriority;
    }
    if (filter.paymentStatus) {
      where.payments = { some: { status: filter.paymentStatus } };
    }
    if (filter.username) {
      where.submittingUser = {
        username: { contains: filter.username, mode: "insensitive" },
      };
    }
    if (filter.search) {
      where.OR = [
        { id: { contains: filter.search, mode: "insensitive" } },
        { trackSnapshot: { songName: { contains: filter.search, mode: "insensitive" } } },
        { trackSnapshot: { artistName: { contains: filter.search, mode: "insensitive" } } },
        { submittingUser: { username: { contains: filter.search, mode: "insensitive" } } },
      ];
    }
    if (filter.dateFrom || filter.dateTo) {
      where.submittedAt = {};
      if (filter.dateFrom) where.submittedAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.submittedAt.lte = new Date(filter.dateTo);
    }

    const [total, submissions] = await Promise.all([
      this.prisma.submission.count({ where }),
      this.prisma.submission.findMany({
        where,
        include: {
          submittingUser: {
            select: { id: true, username: true, email: true },
          },
          trackSnapshot: true,
          payments: true,
          queueEntry: true,
          liveSession: {
            include: {
              station: {
                select: {
                  id: true,
                  stationName: true,
                  host: {
                    include: {
                      user: { select: { id: true, username: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const items: AdminSubmissionSummary[] = submissions.map((s) => {
      const q = s.queueEntry;
      const p = s.payments[0];
      const snap = s.trackSnapshot;
      return {
        id: s.id,
        submittingUserId: s.submittingUserId,
        submittingUsername: s.submittingUser?.username || "Unknown",
        submittingEmail: s.submittingUser?.email || "",
        artistIdentityId: s.artistIdentityId,
        artistName: snap?.artistName || "Unknown Artist",
        songName: snap?.songName || "Untitled Track",
        durationSeconds: snap?.durationSeconds || 0,
        explicitContent: snap?.explicitContent || false,
        stationId: s.liveSession?.station?.id || "",
        stationName: s.liveSession?.station?.stationName || "Main Station",
        hostId: s.liveSession?.station?.host?.user?.id || "",
        hostUsername: s.liveSession?.station?.host?.user?.username || "Host",
        liveSessionId: s.liveSessionId,
        isPriority: s.isPriority,
        tierName: s.isPriority ? "Priority" : "Free Line",
        priorityRank: q?.priorityRank || 0,
        queueStatus: s.currentQueueStatus,
        paymentStatus: p?.status || null,
        grossAmountCents: p?.grossAmountCents || null,
        hostAllocationCents: p?.hostAllocationCents || null,
        platformAllocationCents: p?.platformAllocationCents || null,
        submittedAt: s.submittedAt.toISOString(),
      };
    });

    return { items, total, page, limit };
  }

  async getSubmission(id: string): Promise<AdminSubmissionDetail> {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        submittingUser: {
          select: { id: true, username: true, email: true },
        },
        trackSnapshot: true,
        payments: {
          include: { allocations: true },
        },
        queueEntry: {
          include: {
            queueEvents: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        liveSession: {
          include: {
            station: {
              select: {
                id: true,
                stationName: true,
                host: {
                  include: {
                    user: { select: { id: true, username: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) throw new NotFoundException("Submission not found");

    const snap = submission.trackSnapshot;
    const p = submission.payments[0];
    const q = submission.queueEntry;

    // Fetch related audit logs
    const auditLogsRes = await this.auditLogsService.getAuditLogs({
      targetEntityType: "Submission",
      targetEntityId: id,
    });

    const lifecycleHistory = (q?.queueEvents || []).map((e) => ({
      id: e.id,
      eventType: e.eventType,
      actingUserId: e.actingUserId || "SYSTEM",
      actorName: e.actingUserId ? "User" : "System",
      previousState: e.previousState || null,
      newState: e.newState,
      metadata: e.reason ? { reason: e.reason } : null,
      createdAt: e.createdAt.toISOString(),
    }));

    return {
      id: submission.id,
      submittingUserId: submission.submittingUserId,
      submittingUsername: submission.submittingUser?.username || "Unknown",
      submittingEmail: submission.submittingUser?.email || "",
      artistIdentityId: submission.artistIdentityId,
      artistName: snap?.artistName || "Unknown Artist",
      songName: snap?.songName || "Untitled Track",
      durationSeconds: snap?.durationSeconds || 0,
      explicitContent: snap?.explicitContent || false,
      stationId: submission.liveSession?.station?.id || "",
      stationName: submission.liveSession?.station?.stationName || "Main Station",
      hostId: submission.liveSession?.station?.host?.user?.id || "",
      hostUsername: submission.liveSession?.station?.host?.user?.username || "Host",
      liveSessionId: submission.liveSessionId,
      isPriority: submission.isPriority,
      tierName: submission.isPriority ? "Priority" : "Free Line",
      priorityRank: q?.priorityRank || 0,
      queueStatus: submission.currentQueueStatus,
      paymentStatus: p?.status || null,
      grossAmountCents: p?.grossAmountCents || null,
      hostAllocationCents: p?.hostAllocationCents || null,
      platformAllocationCents: p?.platformAllocationCents || null,
      submittedAt: submission.submittedAt.toISOString(),
      trackSnapshot: {
        albumName: snap?.albumName || null,
        sourceType: snap?.sourceType || "AUDIO_FILE",
        playbackCapability: snap?.playbackCapability || "FULL_PLAYBACK",
        mediaVersionId: snap?.mediaVersionId || null,
        artworkS3Key: snap?.artworkS3Key || null,
        audioFileUrl: null, // In production, signed URLs generated dynamically
      },
      paymentDetails: p
        ? {
            id: p.id,
            providerPaymentId: p.providerPaymentId,
            currency: p.currency,
            status: p.status,
            settledAt: p.settledAt?.toISOString() || null,
            allocations: p.allocations.map((a) => ({
              hostAmountCents: a.hostAmountCents,
              platformGrossAmountCents: a.platformGrossAmountCents,
              stripeFeeAmountCents: a.stripeFeeAmountCents,
              platformNetAmountCents: a.platformNetAmountCents,
              stripeConnectedAccountDest: a.stripeConnectedAccountDest,
            })),
          }
        : null,
      queueEntry: q
        ? {
            id: q.id,
            sortOrder: Number(q.sortOrder),
            status: q.status,
          }
        : null,
      lifecycleHistory,
      auditLogs: auditLogsRes.items,
    };
  }

  async moderateSubmission(
    id: string,
    adminUserId: string,
    dto: AdminSubmissionActionDto,
  ): Promise<{ success: boolean; message: string; submissionId: string }> {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: { queueEntry: true },
    });

    if (!submission) throw new NotFoundException("Submission not found");

    const previousStatus = submission.currentQueueStatus;

    if (dto.action === "REMOVE") {
      await this.prisma.$transaction(async (tx) => {
        // 1. Update Submission status
        await tx.submission.update({
          where: { id },
          data: { currentQueueStatus: QueueStatus.REMOVED },
        });

        // 2. Update QueueEntry if present
        if (submission.queueEntry) {
          await tx.queueEntry.update({
            where: { id: submission.queueEntry.id },
            data: { status: QueueStatus.REMOVED },
          });

          // 3. Record Immutable QueueEvent with eventType ADMIN_REMOVE
          await tx.queueEvent.create({
            data: {
              id: generateUuidV7(),
              queueEntryId: submission.queueEntry.id,
              liveSessionId: submission.liveSessionId,
              actingUserId: adminUserId,
              eventType: "ADMIN_REMOVE",
              previousState: previousStatus,
              newState: QueueStatus.REMOVED,
              reason: dto.reason,
            },
          });
        }

        // 4. Record AdminAuditLog
        await this.auditLogsService.logAction({
          actingAdminUserId: adminUserId,
          actionType: "SUBMISSION_REMOVED",
          targetEntityType: "Submission",
          targetEntityId: id,
          beforeState: { status: previousStatus },
          afterState: { status: QueueStatus.REMOVED, notes: dto.adminNotes },
          reason: dto.reason,
        });
      });

      return {
        success: true,
        message: "Submission removed from queue with audit event",
        submissionId: id,
      };
    }

    if (dto.action === "RESTRICT") {
      await this.prisma.$transaction(async (tx) => {
        await tx.submission.update({
          where: { id },
          data: { currentQueueStatus: QueueStatus.REJECTED },
        });

        await this.auditLogsService.logAction({
          actingAdminUserId: adminUserId,
          actionType: "SUBMISSION_RESTRICTED",
          targetEntityType: "Submission",
          targetEntityId: id,
          beforeState: { status: previousStatus },
          afterState: { status: QueueStatus.REJECTED },
          reason: dto.reason,
        });
      });

      return {
        success: true,
        message: "Submission restricted successfully",
        submissionId: id,
      };
    }

    if (dto.action === "INVESTIGATE_FLAG") {
      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "SUBMISSION_FLAGGED_INVESTIGATION",
        targetEntityType: "Submission",
        targetEntityId: id,
        reason: dto.reason,
        afterState: { adminNotes: dto.adminNotes },
      });

      return {
        success: true,
        message: "Submission flagged for investigation and logged in audit trail",
        submissionId: id,
      };
    }

    throw new BadRequestException("Invalid action type");
  }
}
