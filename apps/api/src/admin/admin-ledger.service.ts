import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import {
  AdminLedgerSummary,
  AdminLedgerEntryDetail,
  AdminCompensatingEntryDto,
  PaymentStatus,
} from "@platform/types";
import { AdminAuditLogsService } from "./admin-audit-logs.service";

@Injectable()
export class AdminLedgerService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  /**
   * PostgreSQL-authoritative reporting on gross volume, platform allocations,
   * host allocations, refunds, and settlement status.
   */
  async getLedgerReport(query: { page?: number; limit?: number } = {}): Promise<{
    summary: AdminLedgerSummary;
    entries: AdminLedgerEntryDetail[];
    total: number;
  }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    // 1. Authoritative Aggregations from Payment & Allocation tables
    const settledPayments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.SETTLED },
      select: {
        grossAmountCents: true,
        hostAllocationCents: true,
        platformAllocationCents: true,
        allocations: {
          select: {
            stripeFeeAmountCents: true,
            platformNetAmountCents: true,
          },
        },
      },
    });

    let grossVolumeCents = 0;
    let platformGrossCents = 0;
    let hostAllocationsCents = 0;
    let stripeFeesCents = 0;
    let platformNetCents = 0;

    for (const p of settledPayments) {
      grossVolumeCents += p.grossAmountCents;
      platformGrossCents += p.platformAllocationCents;
      hostAllocationsCents += p.hostAllocationCents;

      for (const alloc of p.allocations) {
        if (alloc.stripeFeeAmountCents) {
          stripeFeesCents += alloc.stripeFeeAmountCents;
        }
        if (alloc.platformNetAmountCents) {
          platformNetCents += alloc.platformNetAmountCents;
        }
      }
    }

    if (platformNetCents === 0 && platformGrossCents > 0) {
      platformNetCents = Math.max(0, platformGrossCents - stripeFeesCents);
    }

    const [failedCount, pendingCount, refundAgg] = await Promise.all([
      this.prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
      this.prisma.payment.count({
        where: {
          status: { in: [PaymentStatus.CREATED, PaymentStatus.REQUIRES_ACTION] },
        },
      }),
      this.prisma.refund.aggregate({
        _sum: { amountCents: true },
      }),
    ]);

    const refundedVolumeCents = refundAgg._sum.amountCents || 0;

    const summary: AdminLedgerSummary = {
      grossVolumeCents,
      platformGrossCents,
      platformNetCents,
      hostAllocationsCents,
      stripeFeesCents,
      refundedVolumeCents,
      settledPaymentsCount: settledPayments.length,
      failedPaymentsCount: failedCount,
      pendingPaymentsCount: pendingCount,
    };

    // 2. Fetch Paginated Ledger Transactions with relations
    const [total, transactions] = await Promise.all([
      this.prisma.ledgerTransaction.count(),
      this.prisma.ledgerTransaction.findMany({
        include: {
          payment: {
            include: {
              submission: {
                include: {
                  trackSnapshot: true,
                  liveSession: {
                    include: {
                      station: {
                        select: {
                          stationName: true,
                          host: { include: { user: { select: { username: true } } } },
                        },
                      },
                    },
                  },
                },
              },
              allocations: true,
            },
          },
        },
        orderBy: { effectiveAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const entries: AdminLedgerEntryDetail[] = transactions.map((tx) => {
      const p = tx.payment;
      const alloc = p?.allocations[0];
      return {
        id: tx.id,
        transactionId: tx.id,
        paymentId: tx.paymentId || undefined,
        submissionId: p?.submissionId || undefined,
        songName: p?.submission?.trackSnapshot?.songName || undefined,
        artistName: p?.submission?.trackSnapshot?.artistName || undefined,
        stationName: p?.submission?.liveSession?.station?.stationName || undefined,
        hostUsername: p?.submission?.liveSession?.station?.host?.user?.username || undefined,
        systemSource: tx.systemSource,
        description: tx.description,
        grossAmountCents: p?.grossAmountCents || 0,
        hostAmountCents: alloc?.hostAmountCents ?? p?.hostAllocationCents ?? 0,
        platformAmountCents: alloc?.platformGrossAmountCents ?? p?.platformAllocationCents ?? 0,
        stripeFeeAmountCents: alloc?.stripeFeeAmountCents || 0,
        currency: p?.currency || "USD",
        isPosted: tx.isPosted,
        effectiveAt: tx.effectiveAt.toISOString(),
      };
    });

    return { summary, entries, total };
  }

  /**
   * Append a compensating ledger entry.
   * Preserves historical ledger rows without mutating past records.
   */
  async createCompensatingEntry(
    adminUserId: string,
    dto: AdminCompensatingEntryDto,
  ): Promise<{ success: boolean; message: string; transactionId: string }> {
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException("A valid audit reason is required for compensating ledger entries");
    }

    const txId = generateUuidV7();
    const idempotencyKey = `manual_adj_${txId}_${Date.now()}`;

    await this.prisma.$transaction(async (tx) => {
      // Create compensating LedgerTransaction
      await tx.ledgerTransaction.create({
        data: {
          id: txId,
          idempotencyKey,
          description: dto.description || "Administrative Compensating Adjustment",
          systemSource: "MANUAL_ADJUSTMENT",
          paymentId: dto.paymentId || null,
          isPosted: true,
          effectiveAt: new Date(),
        },
      });

      // Audit log creation
      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "LEDGER_COMPENSATING_ENTRY_CREATED",
        targetEntityType: "LedgerTransaction",
        targetEntityId: txId,
        afterState: {
          transactionId: txId,
          hostAmountCents: dto.hostAmountCents,
          platformAmountCents: dto.platformAmountCents,
          description: dto.description,
          paymentId: dto.paymentId,
          submissionId: dto.submissionId,
        },
        reason: dto.reason,
      });
    });

    return {
      success: true,
      message: "Compensating ledger entry recorded successfully",
      transactionId: txId,
    };
  }
}
