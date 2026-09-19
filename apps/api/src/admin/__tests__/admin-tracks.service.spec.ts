import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminTracksService } from "../admin-tracks.service";
import { StorageStatus, ProcessingState } from "@platform/types";

describe("AdminTracksService", () => {
  let service: AdminTracksService;

  const mockPrisma = {
    track: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    trackMediaVersion: {
      updateMany: vi.fn(),
    },
    trackArtwork: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };

  const mockQueueService = {
    enqueueDeleteMediaObjects: vi.fn(),
    enqueueDeleteUserMedia: vi.fn(),
  };

  const mockAuditLogsService = {
    logAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminTracksService(
      mockPrisma as any,
      mockQueueService as any,
      mockAuditLogsService as any,
    );
  });

  describe("getAdminTracks", () => {
    it("should map Prisma response to DTO and apply sorting", async () => {
      const mockTrack = {
        id: "track1",
        songName: "Test Song",
        processingState: ProcessingState.READY,
        createdAt: new Date(),
        lastPlayedAt: new Date(),
        artistIdentity: { artistName: "Artist1" },
        user: { id: "user1", username: "user1" },
        mediaVersions: [
          { fileSize: 1000, storageStatus: StorageStatus.AVAILABLE },
        ],
        submissions: [],
      };

      mockPrisma.track.count.mockResolvedValue(1);
      mockPrisma.track.findMany.mockResolvedValue([mockTrack]);

      const result = await service.getAdminTracks({ sortBy: "lastPlayedDesc" });

      expect(result.length).toBe(1);
      expect(result[0].fileSize).toBe(1000);
    });
  });

  describe("deleteMediaWithSafeguards", () => {
    it("should mark media versions and artwork as DELETION_PENDING and enqueue job", async () => {
      const mockTrack = {
        id: "track1",
        submissions: [],
        mediaVersions: [
          {
            id: "m1",
            originalObjectKey: "o1",
            processedObjectKey: null,
            storageStatus: StorageStatus.AVAILABLE,
          },
        ],
        artworks: [
          {
            id: "a1",
            originalObjectKey: "o2",
            processedObjectKey: null,
            storageStatus: StorageStatus.AVAILABLE,
          },
        ],
      };
      mockPrisma.track.findUnique.mockResolvedValue(mockTrack);

      const res = await service.deleteMediaWithSafeguards("track1", "admin1", {
        purgeS3: true,
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.trackMediaVersion.updateMany).toHaveBeenCalled();
      expect(mockPrisma.trackArtwork.updateMany).toHaveBeenCalled();
      expect(mockQueueService.enqueueDeleteMediaObjects).toHaveBeenCalledWith({
        objectKeys: ["o1", "o2"],
      });
      expect(mockAuditLogsService.logAction).toHaveBeenCalled();
    });
  });
});
