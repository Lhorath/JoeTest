import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import { QueueStatus, LiveSessionStatus } from "@platform/types";
import { SubmissionEligibilityService } from "./submission-eligibility.service";
import { QueueOrderingService } from "../live-sessions/queue-ordering/queue-ordering.service";
import { ReorderIntent } from "../live-sessions/dto/live-session.dto";
import { IdempotencyService } from "../common/idempotency/idempotency.service";
import { StripeService } from "../payments/stripe.service";
import { ApiIdempotencyStatus, PaymentStatus } from "@platform/database";
import * as crypto from "crypto";

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eligibilityService: SubmissionEligibilityService,
    private readonly queueOrderingService: QueueOrderingService,
    private readonly idempotencyService: IdempotencyService,
    private readonly stripeService: StripeService,
  ) {}

  async createSubmission(
    userId: string,
    liveSessionId: string,
    dto: {
      sourceTrackId: string;
      artistIdentityId?: string | null;
      tierSnapshotId?: string;
    },
    idempotencyKey: string,
  ): Promise<any> {
    const fingerprint = crypto
      .createHash("sha256")
      .update(JSON.stringify(dto))
      .digest("hex");
    const path = `/live-sessions/${liveSessionId}/submissions`;

    const lock = await this.idempotencyService.claimLock(
      userId,
      idempotencyKey,
      path,
      fingerprint,
    );
    if (!lock.claimed) {
      return lock.cachedResponse;
    }

    try {
      // 1. Validate Track Ownership, Readiness, and Storage Availability (Requirement 2)
      const track = await this.prisma.track.findUnique({
        where: { id: dto.sourceTrackId },
        include: {
          artistIdentity: true,
          artworks: { take: 1 },
          mediaVersions: { where: { isCurrent: true }, take: 1 },
        },
      });

      if (!track || track.deletedAt) {
        throw new NotFoundException("Track not found or has been deleted");
      }

      if (track.userId !== userId) {
        throw new ForbiddenException(
          "Forbidden: You can only submit tracks from your own library",
        );
      }

      if (track.processingState !== "READY") {
        throw new BadRequestException("Track is not ready for playback");
      }

      const currentMedia = track.mediaVersions?.[0];
      if (currentMedia && currentMedia.storageStatus !== "AVAILABLE") {
        throw new BadRequestException("Track media is not available");
      }

      const artworkKey =
        track.artworks?.[0]?.masterObjectKey ||
        track.artworks?.[0]?.originalObjectKey ||
        null;
      const mediaVerId = currentMedia?.id || null;

      // 2. Validate Artist Identity Ownership if provided (Requirement 1)
      let resolvedArtistName =
        track.artistIdentity?.artistName || track.songName || "Independent Artist";
      let validatedArtistIdentityId: string | null = null;

      if (dto.artistIdentityId && dto.artistIdentityId !== "none") {
        const identity = await this.prisma.artistIdentity.findUnique({
          where: { id: dto.artistIdentityId },
        });
        if (!identity || identity.deletedAt) {
          throw new NotFoundException("Artist identity not found or removed");
        }
        if (identity.userId !== userId) {
          throw new ForbiddenException(
            "Forbidden: You cannot submit under an Artist Identity you do not own",
          );
        }
        validatedArtistIdentityId = identity.id;
        resolvedArtistName = identity.artistName;
      } else if (dto.artistIdentityId === null || dto.artistIdentityId === "none") {
        validatedArtistIdentityId = null;
        resolvedArtistName = track.songName || "Independent Artist";
      } else if (track.artistIdentityId) {
        validatedArtistIdentityId = track.artistIdentityId;
        if (track.artistIdentity && !track.artistIdentity.deletedAt) {
          resolvedArtistName = track.artistIdentity.artistName;
        }
      }

      const eligibility = await this.eligibilityService.getEligibility(
        userId,
        liveSessionId,
      );

      if (!dto.tierSnapshotId) {
        // FREE Submission (Requirement 3 & 4)
        if (!eligibility.free.available) {
          throw new ConflictException(
            `Free submission not available: ${eligibility.free.reason}`,
          );
        }

        const responseData = await this.prisma.$transaction(async (tx) => {
          // Increment user's free usage
          await tx.userLiveSubmissionUsage.upsert({
            where: { userId_liveSessionId: { userId, liveSessionId } },
            update: { freeUsedCount: { increment: 1 } },
            create: {
              id: generateUuidV7(),
              userId,
              liveSessionId,
              freeUsedCount: 1,
              paidUsedCount: 0,
            },
          });

          // Create submission
          const submissionId = generateUuidV7();
          const submission = await tx.submission.create({
            data: {
              id: submissionId,
              submittingUserId: userId,
              sourceTrackId: dto.sourceTrackId,
              artistIdentityId: validatedArtistIdentityId,
              liveSessionId,
              isPriority: false,
              currentQueueStatus: QueueStatus.QUEUED,
            },
          });

          // Create Immutable Track Snapshot (Requirement 15)
          await tx.submissionTrackSnapshot.create({
            data: {
              id: generateUuidV7(),
              submissionId,
              artistName: resolvedArtistName,
              songName: track.songName,
              albumName: track.albumName,
              genre: null,
              explicitContent: track.explicitContent,
              releaseDate: track.releaseDate,
              artworkS3Key: artworkKey,
              sourceType: track.sourceType,
              playbackCapability: track.playbackCapability,
              mediaVersionId: mediaVerId,
              durationSeconds: track.durationSeconds,
            },
          });

          // We fetch existing active entries for bottom ordering
          const destinationEntries = await tx.queueEntry.findMany({
            where: {
              liveSessionId,
              priorityRank: 0,
              status: { in: [QueueStatus.QUEUED, QueueStatus.NEXT] },
            },
            orderBy: { sortOrder: "asc" },
          });

          const { midpoint: newSortOrder } =
            this.queueOrderingService.calculateNewSortOrder(
              ReorderIntent.BOTTOM,
              destinationEntries as any,
              undefined,
            );

          const queueEntryId = generateUuidV7();
          const queueEntry = await tx.queueEntry.create({
            data: {
              id: queueEntryId,
              liveSessionId,
              submissionId,
              status: QueueStatus.QUEUED,
              priorityRank: 0,
              sortOrder: newSortOrder!,
            },
          });

          // Queue Audit Event
          await tx.queueEvent.create({
            data: {
              id: generateUuidV7(),
              queueEntryId,
              liveSessionId,
              actingUserId: userId,
              eventType: "SUBMIT",
              newState: QueueStatus.QUEUED,
            },
          });

          // Increment session queueRevision
          await tx.liveSession.update({
            where: { id: liveSessionId },
            data: { queueRevision: { increment: 1 } },
          });

          return { submission, queueEntry };
        });

        await this.idempotencyService.releaseLock(
          lock.record!.id,
          ApiIdempotencyStatus.COMPLETED,
          responseData,
        );
        return responseData;
      } else {
        // PRIORITY TIER Submission (Requirement 5, 6, 7 & 8)
        const tier = eligibility.priorityTiers.find(
          (t) => t.tierSnapshotId === dto.tierSnapshotId,
        );
        if (!tier) {
          throw new NotFoundException(
            "Priority tier not found for this live session",
          );
        }

        if (!tier.available) {
          throw new ConflictException(
            `Priority submission not available: ${tier.reason}`,
          );
        }

        // Verify payments are enabled
        const platformConfig =
          await this.prisma.stripePlatformConfiguration.findFirst({
            orderBy: { createdAt: "desc" },
          });
        if (!platformConfig || !platformConfig.isPaymentsEnabled) {
          throw new ConflictException(
            "Payments are currently disabled on the platform",
          );
        }

        const emergencyControl =
          await this.prisma.paymentEmergencyControl.findFirst({
            orderBy: { changedAt: "desc" },
          });
        if (emergencyControl && emergencyControl.state !== "PAYMENTS_ENABLED") {
          throw new ConflictException("Payments are currently paused");
        }

        const liveSession = await this.prisma.liveSession.findUnique({
          where: { id: liveSessionId },
          include: {
            station: {
              include: {
                host: {
                  include: {
                    payoutAccounts: {
                      where: { isPrimary: true, provider: "STRIPE" },
                    },
                  },
                },
              },
            },
          },
        });

        if (
          !liveSession ||
          !liveSession.station.host ||
          liveSession.station.host.payoutAccounts.length === 0
        ) {
          throw new ConflictException("Host payout account not configured");
        }

        const connectedAccountId =
          liveSession.station.host.payoutAccounts[0].providerAccountId;

        const snapshotRecord =
          await this.prisma.livePriorityTierSnapshot.findUnique({
            where: { id: dto.tierSnapshotId },
          });
        if (!snapshotRecord) {
          throw new NotFoundException("Priority tier snapshot not found");
        }

        const submissionId = generateUuidV7();
        const paymentId = generateUuidV7();
        const reservationId = generateUuidV7();

        // Create PaymentIntent with authoritative reconciliation metadata (Requirement 8)
        const paymentIntent = await this.stripeService.createPaymentIntent(
          tier.priceCents,
          connectedAccountId,
          {
            submissionId,
            liveSessionId,
            stationId: liveSession.stationId,
            tierSnapshotId: dto.tierSnapshotId,
            userId,
            idempotencyKey,
            tierPriceCents: String(tier.priceCents),
          },
        );

        const responseData = await this.prisma.$transaction(async (tx) => {
          const submission = await tx.submission.create({
            data: {
              id: submissionId,
              submittingUserId: userId,
              sourceTrackId: dto.sourceTrackId,
              artistIdentityId: validatedArtistIdentityId,
              liveSessionId,
              isPriority: true,
              priorityTierSnapshotId: dto.tierSnapshotId,
              currentQueueStatus: QueueStatus.AWAITING_PAYMENT,
            },
          });

          // Create Immutable Track Snapshot (Requirement 15)
          await tx.submissionTrackSnapshot.create({
            data: {
              id: generateUuidV7(),
              submissionId,
              artistName: resolvedArtistName,
              songName: track.songName,
              albumName: track.albumName,
              genre: null,
              explicitContent: track.explicitContent,
              releaseDate: track.releaseDate,
              artworkS3Key: artworkKey,
              sourceType: track.sourceType,
              playbackCapability: track.playbackCapability,
              mediaVersionId: mediaVerId,
              durationSeconds: track.durationSeconds,
            },
          });

          // Create Priority Tier Reservation (Requirement 7)
          await tx.priorityTierReservation.create({
            data: {
              id: reservationId,
              tierSnapshotId: dto.tierSnapshotId!,
              priorityTierId: snapshotRecord.priorityTierId,
              userId,
              trackId: dto.sourceTrackId,
              status: "ACTIVE",
              expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min TTL
            },
          });

          // Create initial QueueEntry in AWAITING_PAYMENT status
          const queueEntryId = generateUuidV7();
          const queueEntry = await tx.queueEntry.create({
            data: {
              id: queueEntryId,
              liveSessionId,
              submissionId,
              status: QueueStatus.AWAITING_PAYMENT,
              priorityRank: tier.priorityRank,
              sortOrder: 0, // Assigned upon payment settlement
            },
          });

          await tx.payment.create({
            data: {
              id: paymentId,
              providerPaymentId: paymentIntent.id,
              payingUserId: userId,
              hostUserId: liveSession.hostId,
              submissionId: submissionId,
              grossAmountCents: tier.priceCents,
              hostAllocationCents: Math.round(tier.priceCents * 0.85),
              platformAllocationCents:
                tier.priceCents - Math.round(tier.priceCents * 0.85),
              status: PaymentStatus.CREATED,
            },
          });

          return {
            submission,
            queueEntry,
            clientSecret: paymentIntent.client_secret,
          };
        });

        await this.idempotencyService.releaseLock(
          lock.record!.id,
          ApiIdempotencyStatus.COMPLETED,
          responseData,
        );
        return responseData;
      }
    } catch (error) {
      await this.idempotencyService.releaseLock(
        lock.record!.id,
        ApiIdempotencyStatus.FAILED,
      );
      throw error;
    }
  }

  async upgradeSubmission(
    userId: string,
    submissionId: string,
    dto: { tierSnapshotId: string },
    idempotencyKey: string,
  ): Promise<any> {
    const fingerprint = crypto
      .createHash("sha256")
      .update(JSON.stringify(dto))
      .digest("hex");
    const path = `/submissions/${submissionId}/upgrade`;

    const lock = await this.idempotencyService.claimLock(
      userId,
      idempotencyKey,
      path,
      fingerprint,
    );
    if (!lock.claimed) {
      return lock.cachedResponse;
    }

    try {
      const submission = await this.prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          queueEntry: true,
          liveSession: {
            include: {
              station: {
                include: {
                  host: {
                    include: {
                      payoutAccounts: {
                        where: { isPrimary: true, provider: "STRIPE" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new NotFoundException("Submission not found");
      }

      if (submission.submittingUserId !== userId) {
        throw new ForbiddenException(
          "Forbidden: You do not own this submission",
        );
      }

      if (submission.isPriority) {
        throw new ConflictException(
          "Submission is already a priority submission",
        );
      }

      // Must be in QUEUED status to upgrade (Requirement 9)
      if (
        submission.currentQueueStatus !== QueueStatus.QUEUED ||
        submission.queueEntry?.status !== QueueStatus.QUEUED
      ) {
        throw new ConflictException(
          "Only queued submissions can be upgraded to Priority",
        );
      }

      if (submission.liveSession.status !== LiveSessionStatus.LIVE) {
        throw new ConflictException("Live session is no longer active");
      }

      const liveSessionId = submission.liveSessionId;
      const eligibility = await this.eligibilityService.getEligibility(
        userId,
        liveSessionId,
      );

      const tier = eligibility.priorityTiers.find(
        (t) => t.tierSnapshotId === dto.tierSnapshotId,
      );
      if (!tier) {
        throw new NotFoundException(
          "Priority tier not found for this live session",
        );
      }
      if (!tier.available) {
        throw new ConflictException(
          `Priority submission not available: ${tier.reason}`,
        );
      }

      // Verify payments are enabled
      const platformConfig =
        await this.prisma.stripePlatformConfiguration.findFirst({
          orderBy: { createdAt: "desc" },
        });
      if (!platformConfig || !platformConfig.isPaymentsEnabled) {
        throw new ConflictException(
          "Payments are currently disabled on the platform",
        );
      }

      const emergencyControl =
        await this.prisma.paymentEmergencyControl.findFirst({
          orderBy: { changedAt: "desc" },
        });
      if (emergencyControl && emergencyControl.state !== "PAYMENTS_ENABLED") {
        throw new ConflictException("Payments are currently paused");
      }

      if (
        !submission.liveSession.station.host ||
        submission.liveSession.station.host.payoutAccounts.length === 0
      ) {
        throw new ConflictException("Host payout account not configured");
      }

      const connectedAccountId =
        submission.liveSession.station.host.payoutAccounts[0].providerAccountId;

      const snapshotRecord =
        await this.prisma.livePriorityTierSnapshot.findUnique({
          where: { id: dto.tierSnapshotId },
        });
      if (!snapshotRecord) {
        throw new NotFoundException("Priority tier snapshot not found");
      }

      const paymentIntent = await this.stripeService.createPaymentIntent(
        tier.priceCents,
        connectedAccountId,
        {
          submissionId,
          liveSessionId,
          stationId: submission.liveSession.stationId,
          tierSnapshotId: dto.tierSnapshotId,
          userId,
          upgradeSubmissionId: submission.id,
          idempotencyKey,
          tierPriceCents: String(tier.priceCents),
        },
      );

      const responseData = await this.prisma.$transaction(async (tx) => {
        // Reserve tier allocation for 15 minutes during checkout
        await tx.priorityTierReservation.create({
          data: {
            id: generateUuidV7(),
            tierSnapshotId: dto.tierSnapshotId,
            priorityTierId: snapshotRecord.priorityTierId,
            userId,
            trackId: submission.sourceTrackId,
            status: "ACTIVE",
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        });

        const paymentId = generateUuidV7();
        const payment = await tx.payment.create({
          data: {
            id: paymentId,
            providerPaymentId: paymentIntent.id,
            payingUserId: userId,
            hostUserId: submission.liveSession.hostId,
            submissionId: submissionId,
            grossAmountCents: tier.priceCents,
            hostAllocationCents: Math.round(tier.priceCents * 0.85),
            platformAllocationCents:
              tier.priceCents - Math.round(tier.priceCents * 0.85),
            status: PaymentStatus.CREATED,
          },
        });

        return { payment, clientSecret: paymentIntent.client_secret };
      });

      await this.idempotencyService.releaseLock(
        lock.record!.id,
        ApiIdempotencyStatus.COMPLETED,
        responseData,
      );
      return responseData;
    } catch (error) {
      await this.idempotencyService.releaseLock(
        lock.record!.id,
        ApiIdempotencyStatus.FAILED,
      );
      throw error;
    }
  }

  async getMySubmissions(
    userId: string,
  ): Promise<import("@platform/types").UserSubmissionSummary[]> {
    const submissions = await this.prisma.submission.findMany({
      where: { submittingUserId: userId },
      orderBy: { submittedAt: "desc" },
      include: {
        liveSession: {
          include: {
            station: true,
          },
        },
        sourceTrack: {
          include: {
            artistIdentity: true,
          },
        },
        trackSnapshot: true,
        priorityTierSnapshot: true,
        queueEntry: true,
      },
    });

    return submissions.map((sub) => {
      const snap = sub.trackSnapshot;
      const track = sub.sourceTrack;
      const tier = sub.priorityTierSnapshot;
      return {
        id: sub.id,
        liveSessionId: sub.liveSessionId,
        sessionTitle: sub.liveSession.liveTitle,
        sessionStatus: sub.liveSession.status as LiveSessionStatus,
        stationName: sub.liveSession.station.stationName,
        songName: snap?.songName || track?.songName || "Untitled Track",
        artistName:
          snap?.artistName ||
          track?.artistIdentity?.artistName ||
          "Unknown Artist",
        durationSeconds: snap?.durationSeconds ?? track?.durationSeconds ?? 0,
        isPriority: sub.isPriority,
        tierName:
          tier?.name || (sub.isPriority ? "Priority" : "Free Line"),
        tierColorSlot: tier?.colorSlot || (sub.isPriority ? "TIER_COLOR_1" : "FREE_LINE"),
        currentQueueStatus: sub.currentQueueStatus as QueueStatus,
        submittedAt: sub.submittedAt,
        queueEntry: sub.queueEntry
          ? {
              id: sub.queueEntry.id,
              status: sub.queueEntry.status as QueueStatus,
              priorityRank: sub.queueEntry.priorityRank,
              sortOrder: Number(sub.queueEntry.sortOrder),
            }
          : null,
      };
    });
  }
}

