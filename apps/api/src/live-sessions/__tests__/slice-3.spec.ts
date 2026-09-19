import { describe, it, expect, vi, beforeEach } from "vitest";
import { LiveSessionsService } from "../live-sessions.service";
import { QueueStatus } from "@platform/types";

describe("LiveSessionsService - Slice 3", () => {
  let service: LiveSessionsService;
  let txMock: any;
  let prismaMock: any;
  let queueOrderingServiceMock: any;

  beforeEach(() => {
    txMock = {
      $queryRaw: vi.fn(),
      queueEntry: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      liveSession: {
        update: vi.fn(),
      },
      submission: {
        update: vi.fn(),
      },
    };

    prismaMock = {
      $transaction: vi.fn(async (cb) => cb(txMock)),
    };

    queueOrderingServiceMock = {
      isNoOp: vi.fn(),
      calculateNewSortOrder: vi.fn(),
      generateRebalanceUpdates: vi.fn(),
    };

    const mockEventService = { emit: vi.fn() };
    service = new LiveSessionsService(
      prismaMock as any,
      queueOrderingServiceMock as any,
      mockEventService as any
    );
  });

  describe("Play Next", () => {
    it("should displace current unplayed track to restore and load next highest priority QUEUED track", async () => {
      const mockSession = {
        id: "sess-1",
        hostId: "host-1",
        queueRevision: 5,
        currentQueueEntryId: "entry-current",
      };
      txMock.$queryRaw.mockResolvedValue([mockSession]);

      const unplayedCurrentEntry = {
        id: "entry-current",
        submissionId: "sub-current",
        status: QueueStatus.PLAYING,
        loadedIntoPlayerAt: new Date(), // Just loaded
        priorityRank: 0,
        sortOrder: 1000,
        originPriorityRank: 0,
        originSortOrder: 1000,
      };

      txMock.queueEntry.findUnique.mockResolvedValue(unplayedCurrentEntry);

      const nextEntry = {
        id: "entry-next",
        submissionId: "sub-next",
        status: QueueStatus.QUEUED,
        priorityRank: 1, // Priority group
        sortOrder: 500,
      };

      txMock.queueEntry.findFirst.mockResolvedValue(nextEntry);
      txMock.queueEntry.findMany.mockResolvedValue([]); // No neighbors for restore

      const result = await service.playNext("host-1", "sess-1", 5);

      expect(result.success).toBe(true);

      // Verify displacement (restore)
      expect(txMock.queueEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "entry-current" },
          data: expect.objectContaining({
            status: QueueStatus.QUEUED,
            sortOrder: 1000,
          }),
        }),
      );

      // Verify load
      expect(txMock.queueEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "entry-next" },
          data: expect.objectContaining({ status: QueueStatus.PLAYING }),
        }),
      );

      // Verify session update
      expect(txMock.liveSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sess-1", queueRevision: 5 },
          data: expect.objectContaining({
            queueRevision: { increment: 1 },
            currentQueueEntryId: "entry-next",
          }),
        }),
      );
    });

    it("should move current played track to history", async () => {
      const mockSession = {
        id: "sess-1",
        hostId: "host-1",
        queueRevision: 5,
        currentQueueEntryId: "entry-current",
      };
      txMock.$queryRaw.mockResolvedValue([mockSession]);

      const playedCurrentEntry = {
        id: "entry-current",
        submissionId: "sub-current",
        status: QueueStatus.PLAYING,
        loadedIntoPlayerAt: new Date(Date.now() - 130000), // Loaded > 2 mins ago
        priorityRank: 0,
        sortOrder: 1000,
        originPriorityRank: 0,
        originSortOrder: 1000,
      };

      txMock.queueEntry.findUnique.mockResolvedValue(playedCurrentEntry);
      txMock.queueEntry.findFirst.mockResolvedValue(null); // Queue is empty

      const result = await service.playNext("host-1", "sess-1", 5);

      expect(result.success).toBe(true);

      // Verify displacement (history)
      expect(txMock.queueEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "entry-current" },
          data: expect.objectContaining({
            status: QueueStatus.MOVED_TO_HISTORY,
            wasPlayed: true,
          }),
        }),
      );

      // Verify session update
      expect(txMock.liveSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sess-1", queueRevision: 5 },
          data: expect.objectContaining({
            queueRevision: { increment: 1 },
            currentQueueEntryId: null,
          }),
        }),
      );
    });
  });

  describe("Move to Next", () => {
    it("should update sort order via QueueOrderingService", async () => {
      const mockSession = { id: "sess-1", hostId: "host-1", queueRevision: 5 };
      txMock.$queryRaw.mockResolvedValue([mockSession]);

      const entryToMove = {
        id: "entry-1",
        liveSessionId: "sess-1",
        status: QueueStatus.QUEUED,
        priorityRank: 0,
        sortOrder: 3000,
      };
      txMock.queueEntry.findUnique.mockResolvedValue(entryToMove);

      txMock.queueEntry.findMany.mockResolvedValue([entryToMove]);
      queueOrderingServiceMock.isNoOp.mockReturnValue(false);
      queueOrderingServiceMock.calculateNewSortOrder.mockReturnValue({
        needsRebalance: false,
        midpoint: 500,
      });

      const result = await service.moveToNext("host-1", "sess-1", "entry-1", 5);
      expect(result.success).toBe(true);

      expect(txMock.queueEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "entry-1" },
          data: { sortOrder: 500 },
        }),
      );
      expect(txMock.liveSession.update).toHaveBeenCalled();
    });

    it("should not increment revision if it's a no-op", async () => {
      const mockSession = { id: "sess-1", hostId: "host-1", queueRevision: 5 };
      txMock.$queryRaw.mockResolvedValue([mockSession]);

      const entryToMove = {
        id: "entry-1",
        liveSessionId: "sess-1",
        status: QueueStatus.QUEUED,
        priorityRank: 0,
      };
      txMock.queueEntry.findUnique.mockResolvedValue(entryToMove);
      queueOrderingServiceMock.isNoOp.mockReturnValue(true);

      const result = await service.moveToNext("host-1", "sess-1", "entry-1", 5);
      expect(result.success).toBe(true);

      expect(txMock.queueEntry.update).not.toHaveBeenCalled();
      expect(txMock.liveSession.update).not.toHaveBeenCalled();
    });
  });
});
