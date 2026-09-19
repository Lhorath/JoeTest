import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@platform/database";
import {
  AdminDashboardMetrics,
  AdminOperationalAlert,
  AdminRecentQueueActivity,
  PaymentStatus,
  LiveSessionStatus,
  HostApplicationStatus,
} from "@platform/types";

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Core Counts from PostgreSQL
    const [
      totalUsers,
      activeHosts,
      pendingHostApplications,
      approvedHosts,
      suspendedHosts,
      liveStations,
      activeLiveSessions,
      submissionsToday,
      submissionsThisWeek,
      paidSubmissions,
      freeLineSubmissions,
      failedPaymentsCount,
      pendingPaymentsCount,
      settledPaymentsAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.hostProfile.count({ where: { suspendedAt: null } }),
      this.prisma.hostApplication.count({
        where: {
          status: { in: [HostApplicationStatus.SUBMITTED, HostApplicationStatus.UNDER_REVIEW] },
        },
      }),
      this.prisma.hostApplication.count({ where: { status: HostApplicationStatus.APPROVED } }),
      this.prisma.hostProfile.count({ where: { suspendedAt: { not: null } } }),
      this.prisma.station.count({
        where: { liveSessions: { some: { status: LiveSessionStatus.LIVE } } },
      }),
      this.prisma.liveSession.count({ where: { status: LiveSessionStatus.LIVE } }),
      this.prisma.submission.count({ where: { submittedAt: { gte: startOfToday } } }),
      this.prisma.submission.count({ where: { submittedAt: { gte: startOfWeek } } }),
      this.prisma.submission.count({ where: { isPriority: true } }),
      this.prisma.submission.count({ where: { isPriority: false } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
      this.prisma.payment.count({
        where: { status: { in: [PaymentStatus.CREATED, PaymentStatus.REQUIRES_ACTION] } },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SETTLED },
        _sum: {
          grossAmountCents: true,
          platformAllocationCents: true,
          hostAllocationCents: true,
        },
      }),
    ]);

    const grossPriorityRevenueCents = settledPaymentsAgg._sum.grossAmountCents || 0;
    const platformRevenueCents = settledPaymentsAgg._sum.platformAllocationCents || 0;
    const hostAllocationsCents = settledPaymentsAgg._sum.hostAllocationCents || 0;

    // 2. Fetch Recent Queue Activity
    const recentEvents = await this.prisma.queueEvent.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        queueEntry: {
          include: {
            submission: {
              include: {
                trackSnapshot: true,
              },
            },
          },
        },
      },
    });

    const recentQueueActivity: AdminRecentQueueActivity[] = recentEvents.map((e) => ({
      id: e.id,
      queueEntryId: e.queueEntryId,
      liveSessionId: e.liveSessionId,
      actingUserId: e.actingUserId,
      actorName: e.actingUserId ? "User/Admin" : "System",
      eventType: e.eventType,
      songName: e.queueEntry?.submission?.trackSnapshot?.songName || "Unknown Track",
      artistName: e.queueEntry?.submission?.trackSnapshot?.artistName || "Unknown Artist",
      previousState: e.previousState,
      newState: e.newState,
      createdAt: e.createdAt.toISOString(),
    }));

    // 3. Operational Alerts Scanner
    const alerts: AdminOperationalAlert[] = [];

    if (failedPaymentsCount > 0) {
      alerts.push({
        id: "alert_failed_payments",
        severity: "WARNING",
        title: `${failedPaymentsCount} Failed Payments Detected`,
        description: `There are ${failedPaymentsCount} payments in FAILED status requiring investigation.`,
        createdAt: now.toISOString(),
        suggestedAction: "Check payments tab and Stripe logs",
      });
    }

    if (pendingHostApplications > 0) {
      alerts.push({
        id: "alert_pending_hosts",
        severity: "INFO",
        title: `${pendingHostApplications} Pending Host Applications`,
        description: "New host applications awaiting review and manual approval.",
        createdAt: now.toISOString(),
        suggestedAction: "Review in Host Applications section",
      });
    }

    // Check for active live sessions with suspended host
    if (suspendedHosts > 0) {
      const liveSuspended = await this.prisma.liveSession.count({
        where: {
          status: LiveSessionStatus.LIVE,
          station: {
            host: {
              suspendedAt: { not: null },
            },
          },
        },
      });
      if (liveSuspended > 0) {
        alerts.push({
          id: "alert_suspended_host_live",
          severity: "CRITICAL",
          title: "Suspended Host has Active Live Session",
          description: `${liveSuspended} live session(s) active on a suspended host station.`,
          createdAt: now.toISOString(),
          suggestedAction: "Terminate active broadcast immediately",
        });
      }
    }

    return {
      totalUsers,
      activeHosts,
      pendingHostApplications,
      approvedHosts,
      suspendedHosts,
      liveStations,
      activeLiveSessions,
      submissionsToday,
      submissionsThisWeek,
      paidSubmissions,
      freeLineSubmissions,
      grossPriorityRevenueCents,
      platformRevenueCents,
      hostAllocationsCents,
      failedPaymentsCount,
      pendingPaymentsCount,
      alerts,
      recentQueueActivity,
    };
  }
}
