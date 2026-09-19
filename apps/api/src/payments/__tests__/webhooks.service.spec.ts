import { describe, it, expect, vi, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { WebhooksService } from "../webhooks.service";
import { PrismaClient, PaymentStatus, QueueStatus } from "@platform/database";
import { QueueOrderingService } from "../../live-sessions/queue-ordering/queue-ordering.service";
import Stripe from "stripe";

describe("WebhooksService", () => {
  let service: WebhooksService;

  const mockPrisma = {
    $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    paymentProviderEvent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    paymentAllocation: {
      create: vi.fn(),
    },
    ledgerTransaction: {
      create: vi.fn(),
    },
    queueEntry: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    submission: {
      update: vi.fn(),
    },
    liveSession: {
      update: vi.fn(),
    },
    queueEvent: {
      create: vi.fn(),
    },
    priorityTierReservation: {
      updateMany: vi.fn(),
    },
    livePriorityTierSnapshot: {
      findUnique: vi.fn(),
    },
    submissionUpgrade: {
      create: vi.fn(),
    },
    userLiveSubmissionUsage: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const mockQueueOrderingService = {
    calculateNewSortOrder: vi
      .fn()
      .mockReturnValue({ midpoint: 1000, needsRebalance: false }),
    generateRebalanceUpdates: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaClient, useValue: mockPrisma },
        { provide: QueueOrderingService, useValue: mockQueueOrderingService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    vi.clearAllMocks();
  });

  it("should skip already completed events", async () => {
    mockPrisma.paymentProviderEvent.findUnique.mockResolvedValue({
      processingState: "COMPLETED",
    });

    await service.processEvent({ id: "evt_123" } as any, "{}");

    expect(mockPrisma.paymentProviderEvent.upsert).not.toHaveBeenCalled();
  });

  it("should process payment_intent.succeeded for new submission", async () => {
    mockPrisma.paymentProviderEvent.findUnique.mockResolvedValue(null);
    mockPrisma.paymentProviderEvent.upsert.mockResolvedValue({ id: "event_1" });

    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "pay_1",
      status: "CREATED",
      submission: {
        id: "sub_1",
        liveSessionId: "ls_1",
        queueEntry: { id: "qe_1", priorityRank: 5 },
      },
    });

    const event = {
      id: "evt_123",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          transfer_data: { destination: "acct_123" },
        },
      },
    } as any;

    await service.processEvent(event, "{}");

    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PaymentStatus.SETTLED }),
      }),
    );
    expect(mockPrisma.submission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentQueueStatus: QueueStatus.QUEUED,
        }),
      }),
    );
    expect(mockPrisma.queueEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: QueueStatus.QUEUED,
          sortOrder: 1000,
        }),
      }),
    );
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ queueRevision: { increment: 1 } }),
      }),
    );
  });

  it("should handle needsRebalance logic when calculating placement", async () => {
    mockPrisma.paymentProviderEvent.findUnique.mockResolvedValue(null);
    mockPrisma.paymentProviderEvent.upsert.mockResolvedValue({ id: "event_1" });

    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "pay_1",
      status: "CREATED",
      submission: {
        id: "sub_1",
        liveSessionId: "ls_1",
        queueEntry: { id: "qe_1", priorityRank: 5 },
      },
    });

    mockQueueOrderingService.calculateNewSortOrder.mockReturnValueOnce({
      midpoint: 1000,
      needsRebalance: true,
    });
    mockQueueOrderingService.generateRebalanceUpdates.mockReturnValueOnce([
      { id: "qe_1", sortOrder: 1000 },
    ]);

    const event = {
      id: "evt_123",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          transfer_data: { destination: "acct_123" },
        },
      },
    } as any;

    await service.processEvent(event, "{}");

    expect(
      mockQueueOrderingService.generateRebalanceUpdates,
    ).toHaveBeenCalled();
    expect(mockPrisma.queueEntry.update).toHaveBeenCalled();
  });
});
