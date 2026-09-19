import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminSubmissionsService } from "../admin-submissions.service";
import { QueueStatus } from "@platform/types";

describe("AdminSubmissionsService", () => {
  let service: AdminSubmissionsService;

  const mockPrisma = {
    submission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    queueEntry: {
      update: vi.fn(),
    },
    queueEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };

  const mockAuditLogsService = {
    logAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminSubmissionsService(
      mockPrisma as any,
      mockAuditLogsService as any,
    );
  });

  describe("getSubmissions", () => {
    it("should return mapped submissions list", async () => {
      const mockSub = {
        id: "sub_1",
        isPriority: true,
        currentQueueStatus: QueueStatus.QUEUED,
        submittedAt: new Date(),
        submittingUser: { id: "u_1", username: "alice", displayName: "Alice" },
        trackSnapshot: { songName: "Song A", artistName: "Artist A" },
        liveSession: {
          id: "ls_1",
          station: {
            stationName: "Station 1",
            host: { user: { username: "bob" } },
          },
        },
        queueEntry: { id: "qe_1", priorityRank: 1 },
        payments: [{ id: "p_1", status: "SETTLED", grossAmountCents: 1500 }],
      };

      mockPrisma.submission.count.mockResolvedValue(1);
      mockPrisma.submission.findMany.mockResolvedValue([mockSub]);

      const res = await service.getSubmissions({ limit: 10, page: 1 });

      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
      expect(res.items[0].songName).toBe("Song A");
      expect(res.items[0].tierName).toBe("Priority");
      expect(res.items[0].priorityRank).toBe(1);
    });
  });

  describe("moderateSubmission", () => {
    it("should remove submission from queue and log audit event", async () => {
      const mockSub = {
        id: "sub_1",
        currentQueueStatus: QueueStatus.QUEUED,
        liveSessionId: "ls_1",
        queueEntry: { id: "qe_1" },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSub);

      const res = await service.moderateSubmission("sub_1", "admin_1", {
        action: "REMOVE",
        reason: "Explicit content violation",
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.submission.update).toHaveBeenCalledWith({
        where: { id: "sub_1" },
        data: { currentQueueStatus: QueueStatus.REMOVED },
      });
      expect(mockPrisma.queueEntry.update).toHaveBeenCalled();
      expect(mockPrisma.queueEvent.create).toHaveBeenCalled();
      expect(mockAuditLogsService.logAction).toHaveBeenCalled();
    });
  });
});
