import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@platform/database";
import {
  AdminPaymentFilterDto,
  AdminPaymentSummary,
  PaymentStatus,
} from "@platform/types";

@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getPayments(filter: AdminPaymentFilterDto = {}): Promise<{
    items: AdminPaymentSummary[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.submissionId) {
      where.submissionId = filter.submissionId;
    }
    if (filter.status) {
      where.status = filter.status as PaymentStatus;
    }
    if (filter.payingUserId) {
      where.payingUserId = filter.payingUserId;
    }
    if (filter.hostId) {
      where.hostUserId = filter.hostId;
    }
    if (filter.stationId) {
      where.submission = { liveSession: { stationId: filter.stationId } };
    }
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
    }
    if (filter.search) {
      where.OR = [
        { id: { contains: filter.search, mode: "insensitive" } },
        { providerPaymentId: { contains: filter.search, mode: "insensitive" } },
        { payingUser: { username: { contains: filter.search, mode: "insensitive" } } },
      ];
    }

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: {
          payingUser: { select: { id: true, username: true } },
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
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const items: AdminPaymentSummary[] = payments.map((p) => ({
      id: p.id,
      submissionId: p.submissionId,
      providerPaymentId: p.providerPaymentId,
      payingUserId: p.payingUserId,
      payingUsername: p.payingUser?.username || "Unknown",
      stationName: p.submission?.liveSession?.station?.stationName || null,
      hostUsername: p.submission?.liveSession?.station?.host?.user?.username || null,
      songName: p.submission?.trackSnapshot?.songName || null,
      grossAmountCents: p.grossAmountCents,
      hostAllocationCents: p.hostAllocationCents,
      platformAllocationCents: p.platformAllocationCents,
      currency: p.currency,
      status: p.status,
      isPriority: true,
      settledAt: p.settledAt ? p.settledAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }));

    return { items, total, page, limit };
  }

  async getPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        payingUser: { select: { id: true, username: true, email: true } },
        allocations: true,
        ledgerTransactions: { include: { entries: true } },
        submission: {
          include: {
            trackSnapshot: true,
            liveSession: {
              include: {
                station: {
                  select: {
                    id: true,
                    stationName: true,
                    host: { include: { user: { select: { id: true, username: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException("Payment not found");

    return {
      id: payment.id,
      submissionId: payment.submissionId,
      providerPaymentId: payment.providerPaymentId,
      payingUserId: payment.payingUserId,
      payingUsername: payment.payingUser?.username || "Unknown",
      stationName: payment.submission?.liveSession?.station?.stationName || null,
      hostUsername: payment.submission?.liveSession?.station?.host?.user?.username || null,
      songName: payment.submission?.trackSnapshot?.songName || null,
      grossAmountCents: payment.grossAmountCents,
      hostAllocationCents: payment.hostAllocationCents,
      platformAllocationCents: payment.platformAllocationCents,
      currency: payment.currency,
      status: payment.status,
      isPriority: true,
      settledAt: payment.settledAt ? payment.settledAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
      allocations: payment.allocations.map((a) => ({
        id: a.id,
        grossAmountCents: a.grossAmountCents,
        hostAmountCents: a.hostAmountCents,
        platformGrossAmountCents: a.platformGrossAmountCents,
        stripeFeeAmountCents: a.stripeFeeAmountCents,
        platformNetAmountCents: a.platformNetAmountCents,
        stripeConnectedAccountDest: a.stripeConnectedAccountDest,
        allocatedAt: a.allocatedAt.toISOString(),
      })),
      ledgerTransactions: payment.ledgerTransactions.map((tx) => ({
        id: tx.id,
        systemSource: tx.systemSource,
        description: tx.description,
        isPosted: tx.isPosted,
        effectiveAt: tx.effectiveAt.toISOString(),
      })),
    };
  }
}
