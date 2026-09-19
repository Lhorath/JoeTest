import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import {
  AdminReconciliationReport,
  AdminDiscrepancyItem,
  AdminRepairDto,
  AdminRepairResult,
  PaymentStatus,
  ReservationStatus,
  QueueStatus,
} from "@platform/types";
import { AdminAuditLogsService } from "./admin-audit-logs.service";

@Injectable()
export class AdminReconciliationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  /**
   * Scan database for anomalies and reconciliation discrepancies.
   * Pure read-only operation.
   */
  async scanDiscrepancies(): Promise<AdminReconciliationReport> {
    const discrepancies: AdminDiscrepancyItem[] = [];
    const now = new Date();

    // 1. Settled payments with missing PaymentAllocation
    const settledPayments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.SETTLED },
      include: { allocations: true, submission: { include: { queueEntry: true } } },
      take: 200,
    });

    for (const p of settledPayments) {
      if (!p.allocations || p.allocations.length === 0) {
        discrepancies.push({
          id: `disc_alloc_${p.id}`,
          type: "PAYMENT_SETTLED_NO_ALLOCATION",
          severity: "CRITICAL",
          title: `Settled Payment ${p.id.substring(0, 8)} has no PaymentAllocation`,
          details: `Gross: $${(p.grossAmountCents / 100).toFixed(2)}. Allocations table has 0 rows for this settled payment.`,
          paymentId: p.id,
          submissionId: p.submissionId || undefined,
          detectedAt: now.toISOString(),
          repairable: true,
        });
      }

      if (p.submission && !p.submission.queueEntry) {
        discrepancies.push({
          id: `disc_qentry_${p.id}`,
          type: "PAYMENT_SETTLED_NO_QUEUE_ENTRY",
          severity: "WARNING",
          title: `Submission ${p.submission?.id ? p.submission.id.substring(0, 8) : "unknown"} is settled but missing QueueEntry`,
          details: `Submission has payment settled but no linked QueueEntry row exists.`,
          paymentId: p.id,
          submissionId: p.submission?.id || p.submissionId || undefined,
          detectedAt: now.toISOString(),
          repairable: true,
        });
      }
    }

    // 2. Active Priority Tier Reservations older than 15 minutes
    const staleReservations = await this.prisma.priorityTierReservation.findMany({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      take: 100,
    });

    for (const res of staleReservations) {
      discrepancies.push({
        id: `disc_res_${res.id}`,
        type: "EXPIRED_ACTIVE_RESERVATION",
        severity: "WARNING",
        title: `Active reservation ${res.id.substring(0, 8)} is past expiration`,
        details: `Expired at ${res.expiresAt.toISOString()} but still marked ACTIVE in database.`,
        reservationId: res.id,
        detectedAt: now.toISOString(),
        repairable: true,
      });
    }

    // 3. Stuck unsettled payments older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckPending = await this.prisma.payment.findMany({
      where: {
        status: { in: [PaymentStatus.CREATED, PaymentStatus.REQUIRES_ACTION] },
        createdAt: { lt: thirtyMinutesAgo },
      },
      take: 100,
    });

    for (const p of stuckPending) {
      discrepancies.push({
        id: `disc_stuck_${p.id}`,
        type: "STUCK_PENDING_PAYMENT",
        severity: "INFO",
        title: `Payment ${p.id.substring(0, 8)} pending > 30 minutes`,
        details: `Created at ${p.createdAt.toISOString()} with no settlement or cancellation webhook.`,
        paymentId: p.id,
        submissionId: p.submissionId || undefined,
        detectedAt: now.toISOString(),
        repairable: true,
      });
    }

    const criticalCount = discrepancies.filter((d) => d.severity === "CRITICAL").length;

    return {
      scannedAt: now.toISOString(),
      totalChecked: settledPayments.length + staleReservations.length + stuckPending.length,
      discrepanciesCount: discrepancies.length,
      criticalCount,
      discrepancies,
    };
  }

  /**
   * Execute an audited repair on a flagged discrepancy.
   */
  async repairDiscrepancy(adminUserId: string, dto: AdminRepairDto): Promise<AdminRepairResult> {
    if (!dto.reason || dto.reason.trim().length < 3) {
      throw new BadRequestException("Audit reason is required for repair operations");
    }

    const now = new Date();

    switch (dto.discrepancyType) {
      case "PAYMENT_SETTLED_NO_ALLOCATION": {
        const payment = await this.prisma.payment.findUnique({
          where: { id: dto.targetId },
          include: { allocations: true },
        });
        if (!payment) throw new BadRequestException("Payment not found");
        if (payment.allocations.length > 0) {
          return {
            success: true,
            message: "Allocation already exists, no action required",
            targetId: dto.targetId,
            repairedAt: now.toISOString(),
          };
        }

        const allocId = generateUuidV7();
        await this.prisma.$transaction(async (tx) => {
          await tx.paymentAllocation.create({
            data: {
              id: allocId,
              paymentId: payment.id,
              grossAmountCents: payment.grossAmountCents,
              hostPercentage: 85.0,
              platformPercentage: 15.0,
              hostAmountCents: payment.hostAllocationCents,
              platformGrossAmountCents: payment.platformAllocationCents,
              currency: payment.currency,
              stripeConnectedAccountDest: "reconciled_fallback",
            },
          });

          await this.auditLogsService.logAction({
            actingAdminUserId: adminUserId,
            actionType: "RECONCILIATION_ALLOCATION_REPAIRED",
            targetEntityType: "Payment",
            targetEntityId: payment.id,
            afterState: { allocationId: allocId, grossCents: payment.grossAmountCents },
            reason: dto.reason,
          });
        });

        return {
          success: true,
          message: `Successfully generated missing allocation for payment ${payment.id}`,
          targetId: dto.targetId,
          repairedAt: now.toISOString(),
        };
      }

      case "EXPIRED_ACTIVE_RESERVATION": {
        const res = await this.prisma.priorityTierReservation.findUnique({
          where: { id: dto.targetId },
        });
        if (!res) throw new BadRequestException("Reservation not found");

        await this.prisma.priorityTierReservation.update({
          where: { id: dto.targetId },
          data: { status: ReservationStatus.EXPIRED },
        });

        await this.auditLogsService.logAction({
          actingAdminUserId: adminUserId,
          actionType: "RECONCILIATION_RESERVATION_EXPIRED",
          targetEntityType: "PriorityTierReservation",
          targetEntityId: dto.targetId,
          reason: dto.reason,
        });

        return {
          success: true,
          message: `Successfully released expired reservation ${dto.targetId}`,
          targetId: dto.targetId,
          repairedAt: now.toISOString(),
        };
      }

      case "STUCK_PENDING_PAYMENT": {
        const payment = await this.prisma.payment.findUnique({
          where: { id: dto.targetId },
        });
        if (!payment) throw new BadRequestException("Payment not found");

        await this.prisma.payment.update({
          where: { id: dto.targetId },
          data: { status: PaymentStatus.CANCELLED },
        });

        await this.auditLogsService.logAction({
          actingAdminUserId: adminUserId,
          actionType: "RECONCILIATION_PAYMENT_CANCELLED",
          targetEntityType: "Payment",
          targetEntityId: dto.targetId,
          reason: dto.reason,
        });

        return {
          success: true,
          message: `Marked abandoned pending payment ${dto.targetId} as CANCELLED`,
          targetId: dto.targetId,
          repairedAt: now.toISOString(),
        };
      }

      default:
        throw new BadRequestException(`Unknown discrepancy type: ${dto.discrepancyType}`);
    }
  }
}
