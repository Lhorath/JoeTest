import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@platform/database";
import { LiveSessionStatus, QueueStatus } from "@platform/types";
import {
  SubmissionEligibilityResponse,
  SubmissionEligibilityReason,
  TierEligibilityInfo,
} from "./dto/submission.dto";

@Injectable()
export class SubmissionEligibilityService {
  constructor(private readonly prisma: PrismaClient) {}

  async getEligibility(
    userId: string,
    liveSessionId: string,
  ): Promise<SubmissionEligibilityResponse> {
    const liveSession = await this.prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      include: {
        station: {
          include: {
            settings: true,
          },
        },
        freeLineConfigurations: true,
        priorityTierSnapshots: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!liveSession || liveSession.status !== LiveSessionStatus.LIVE) {
      throw new NotFoundException("Active LiveSession not found");
    }

    const userUsage = await this.prisma.userLiveSubmissionUsage.findUnique({
      where: { userId_liveSessionId: { userId, liveSessionId } },
    });

    const freeUsedCount = userUsage?.freeUsedCount || 0;

    const activeFreeEntries = await this.prisma.queueEntry.findMany({
      where: {
        liveSessionId,
        status: {
          in: [QueueStatus.QUEUED, QueueStatus.NEXT, QueueStatus.PLAYING],
        },
        submission: {
          isPriority: false,
        },
      },
      include: {
        submission: true,
      },
    });

    const totalActiveFree = activeFreeEntries.length;
    const userActiveFree = activeFreeEntries.filter(
      (e) => e.submission.submittingUserId === userId,
    ).length;

    const freeLineConfig = await this.prisma.freeLineConfiguration.findFirst({
      where: { liveSessionId },
      orderBy: { createdAt: "desc" },
    });

    let freeAvailable = true;
    let freeReason = SubmissionEligibilityReason.AVAILABLE;

    if (!liveSession.submissionsOpen) {
      freeAvailable = false;
      freeReason = SubmissionEligibilityReason.SUBMISSIONS_DISABLED;
    } else if (
      !liveSession.freeLineOpen ||
      !freeLineConfig ||
      !freeLineConfig.isEnabled
    ) {
      freeAvailable = false;
      freeReason = SubmissionEligibilityReason.FREE_LINE_DISABLED;
    } else if (
      freeLineConfig.activeEntryCapacityLimit &&
      userActiveFree >= freeLineConfig.activeEntryCapacityLimit
    ) {
      freeAvailable = false;
      freeReason = SubmissionEligibilityReason.ACTIVE_FREE_LIMIT_REACHED;
    } else if (
      freeLineConfig.maxFreeSubmissionsPerUser &&
      freeUsedCount >= freeLineConfig.maxFreeSubmissionsPerUser
    ) {
      freeAvailable = false;
      freeReason = SubmissionEligibilityReason.TOTAL_FREE_LIMIT_REACHED;
    } else if (
      freeLineConfig.totalFreeCapacityLimit &&
      totalActiveFree >= freeLineConfig.totalFreeCapacityLimit
    ) {
      freeAvailable = false;
      freeReason = SubmissionEligibilityReason.TOTAL_FREE_CAPACITY_REACHED;
    }

    const freeInfo: TierEligibilityInfo = {
      isFree: true,
      available: freeAvailable,
      reason: freeReason,
      name: "Free Line",
      priceCents: 0,
      priorityRank: 0,
    };

    const priorityTiers: TierEligibilityInfo[] = [];

    const userActivePriorityEntries = await this.prisma.queueEntry.findMany({
      where: {
        liveSessionId,
        status: {
          in: [
            QueueStatus.AWAITING_PAYMENT,
            QueueStatus.QUEUED,
            QueueStatus.NEXT,
            QueueStatus.PLAYING,
          ],
        },
        submission: {
          submittingUserId: userId,
          isPriority: true,
        },
      },
      include: {
        submission: true,
      },
    });

    // Check station-level per-user paid simultaneous cap (Requirement 13)
    const paidCapSetting = liveSession.station?.settings?.find(
      (s) =>
        s.key === "maxSimultaneousPaidEntriesPerUser" ||
        s.key === "maxPaidActiveEntriesPerUser",
    );
    const stationPaidCap = paidCapSetting
      ? parseInt(paidCapSetting.value, 10)
      : null;
    const userActivePaidCount = userActivePriorityEntries.filter(
      (e) =>
        e.status === QueueStatus.QUEUED ||
        e.status === QueueStatus.NEXT ||
        e.status === QueueStatus.PLAYING,
    ).length;

    const userUpgrades = await this.prisma.submissionUpgrade.findMany({
      where: {
        upgradedByUserId: userId,
        newTierSnapshot: { liveSessionId },
      },
    });

    const userSubmissions = await this.prisma.submission.findMany({
      where: { submittingUserId: userId, liveSessionId, isPriority: true },
    });

    // Also include active unexpired reservations
    const activeReservations =
      await this.prisma.priorityTierReservation.findMany({
        where: {
          tierSnapshot: { liveSessionId },
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
      });

    for (const tier of liveSession.priorityTierSnapshots || []) {
      let tierAvailable = true;
      let tierReason = SubmissionEligibilityReason.AVAILABLE;

      if (!liveSession.submissionsOpen || !liveSession.paidSubmissionsOpen) {
        tierAvailable = false;
        tierReason = SubmissionEligibilityReason.SUBMISSIONS_DISABLED;
      } else if (!tier.isActive) {
        tierAvailable = false;
        tierReason = SubmissionEligibilityReason.TIER_DISABLED;
      } else if (
        stationPaidCap !== null &&
        !isNaN(stationPaidCap) &&
        stationPaidCap > 0 &&
        userActivePaidCount >= stationPaidCap
      ) {
        tierAvailable = false;
        tierReason = SubmissionEligibilityReason.USER_TIER_LIMIT_REACHED;
      } else {
        const userActiveInTier = userActivePriorityEntries.filter(
          (e) => e.submission.priorityTierSnapshotId === tier.id,
        ).length;
        const userReservationsInTier = activeReservations.filter(
          (r) => r.tierSnapshotId === tier.id && r.userId === userId,
        ).length;

        if (
          tier.maxSimultaneousActiveEntries &&
          userActiveInTier + userReservationsInTier >=
            tier.maxSimultaneousActiveEntries
        ) {
          tierAvailable = false;
          tierReason = SubmissionEligibilityReason.USER_TIER_LIMIT_REACHED;
        }

        const totalUserPurchases =
          userSubmissions.filter((s) => s.priorityTierSnapshotId === tier.id)
            .length +
          userUpgrades.filter((u) => u.newTierSnapshotId === tier.id).length;

        if (
          tier.maxPurchasesPerUserPerLive &&
          totalUserPurchases >= tier.maxPurchasesPerUserPerLive
        ) {
          tierAvailable = false;
          tierReason = SubmissionEligibilityReason.USER_TIER_LIMIT_REACHED;
        }

        if (tier.maxPurchasesPerLive) {
          const globalPurchases =
            (await this.prisma.submission.count({
              where: { priorityTierSnapshotId: tier.id },
            })) +
            (await this.prisma.submissionUpgrade.count({
              where: { newTierSnapshotId: tier.id },
            }));
          const totalReservationsInTier = activeReservations.filter(
            (r) => r.tierSnapshotId === tier.id,
          ).length;

          if (
            globalPurchases + totalReservationsInTier >=
            tier.maxPurchasesPerLive
          ) {
            tierAvailable = false;
            tierReason =
              SubmissionEligibilityReason.TOTAL_TIER_CAPACITY_REACHED;
          }
        }
      }

      priorityTiers.push({
        tierSnapshotId: tier.id,
        isFree: false,
        available: tierAvailable,
        reason: tierReason,
        name: tier.name,
        priceCents: tier.priceCents,
        priorityRank: tier.priorityRank,
        colorSlot: tier.colorSlot,
      });
    }

    return {
      liveSessionId,
      free: freeInfo,
      priorityTiers,
    };
  }
}
