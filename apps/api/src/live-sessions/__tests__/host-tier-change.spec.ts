import { describe, it, expect, vi, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { LiveSessionsService } from "../live-sessions.service";
import { QueueOrderingService } from "../queue-ordering/queue-ordering.service";
import { LiveSessionsEventService } from "../live-sessions-event.service";
import { PrismaClient } from "@platform/database";

describe("Host Manual Tier Change", () => {
  let service: LiveSessionsService;

  const mockPrisma = {
    $transaction: vi.fn(async (cb) => {
      return cb(mockPrisma);
    }),
    liveSession: {
      findUnique: vi.fn().mockResolvedValue({ id: "ls_1", hostId: "host_1" }),
    },
    queueEntry: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    submission: {
      update: vi.fn(),
    },
    livePriorityTierSnapshot: {
      findFirst: vi.fn(),
    },
  };

  const mockQueueOrderingService = {
    calculateNewSortOrder: vi.fn().mockReturnValue({ midpoint: 500 }),
    isNoOp: vi.fn(),
    generateRebalanceUpdates: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveSessionsService,
        { provide: PrismaClient, useValue: mockPrisma },
        { provide: QueueOrderingService, useValue: mockQueueOrderingService },
        { provide: LiveSessionsEventService, useValue: { emit: vi.fn() } },
      ],
    }).compile();

    service = module.get<LiveSessionsService>(LiveSessionsService);
    vi.clearAllMocks();
  });

  it("should change tier from Free to Priority and preserve Free origin", async () => {
    mockPrisma.queueEntry.findFirst.mockResolvedValue({
      id: "qe_1",
      submissionId: "sub_1",
      priorityRank: 0,
      sortOrder: 100,
      tierOriginPriorityRank: null,
      tierOriginSortOrder: null,
      submission: { isPriority: false },
    });
    mockPrisma.livePriorityTierSnapshot.findFirst.mockResolvedValue({
      id: "ts_1",
      priorityRank: 10,
    });

    await service.changeEntryTier("host_1", "ls_1", "qe_1", {
      destinationType: "PRIORITY_TIER",
      tierSnapshotId: "ts_1",
    });

    expect(mockPrisma.queueEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          priorityRank: 10,
          tierOriginPriorityRank: 0,
          tierOriginSortOrder: 100,
        }),
      }),
    );
  });

  it("should restore Free origin when changing back from Priority to Free", async () => {
    mockPrisma.queueEntry.findFirst.mockResolvedValue({
      id: "qe_1",
      submissionId: "sub_1",
      priorityRank: 10,
      sortOrder: 600,
      tierOriginPriorityRank: 0,
      tierOriginSortOrder: 100,
      submission: { isPriority: true, priorityTierSnapshotId: "ts_1" },
    });

    await service.changeEntryTier("host_1", "ls_1", "qe_1", {
      destinationType: "FREE",
    });

    expect(mockPrisma.queueEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          priorityRank: 0,
          sortOrder: 100,
        }),
      }),
    );
  });
});
