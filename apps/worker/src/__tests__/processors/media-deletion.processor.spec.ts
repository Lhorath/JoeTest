import { describe, it, expect, vi, beforeEach } from "vitest";
import { MediaDeletionProcessor } from "../../processors/media-deletion.processor";
import { StorageStatus } from "@platform/types";

describe("MediaDeletionProcessor", () => {
  let processor: MediaDeletionProcessor;

  const mockStorageService = {
    deleteObject: vi.fn(),
  };

  const mockPrisma = {
    $transaction: vi.fn((cb) => cb(mockPrisma)),
    trackMediaVersion: {
      updateMany: vi.fn(),
    },
    trackArtwork: {
      updateMany: vi.fn(),
    },
    track: {
      findMany: vi.fn(),
    },
  };

  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new MediaDeletionProcessor(
      mockStorageService as any,
      mockPrisma as any,
      mockLogger as any,
    );
  });

  describe("processDeleteMediaObjects", () => {
    it("should successfully delete objects and mark as DELETED in DB", async () => {
      mockStorageService.deleteObject.mockResolvedValue(undefined);

      const job = { data: { objectKeys: ["key1", "key2"] } };

      const res = await processor.processDeleteMediaObjects(job as any);

      expect(res.success).toBe(true);
      expect(res.deletedCount).toBe(2);
      expect(mockStorageService.deleteObject).toHaveBeenCalledTimes(2);
      expect(mockPrisma.trackMediaVersion.updateMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        data: { storageStatus: StorageStatus.DELETED },
      });
    });

    it("should aggregate errors and throw if deletions fail", async () => {
      mockStorageService.deleteObject.mockRejectedValueOnce(
        new Error("S3 Error"),
      );

      const job = { data: { objectKeys: ["key1"] } };

      await expect(
        processor.processDeleteMediaObjects(job as any),
      ).rejects.toThrow("Failed to delete 1 objects");
      expect(mockPrisma.trackMediaVersion.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("processDeleteUserMedia", () => {
    it("should aggregate object keys for user and process deletion in chunks", async () => {
      mockPrisma.track.findMany.mockResolvedValue([
        {
          id: "track1",
          mediaVersions: [
            {
              originalObjectKey: "mv1",
              storageStatus: StorageStatus.AVAILABLE,
            },
          ],
          artworks: [
            {
              originalObjectKey: "aw1",
              storageStatus: StorageStatus.AVAILABLE,
            },
          ],
        },
      ]);
      mockStorageService.deleteObject.mockResolvedValue(undefined);

      const job = { data: { ownerUserId: "user1" } };

      const res = await processor.processDeleteUserMedia(job as any);

      expect(res.success).toBe(true);
      expect(res.totalDeleted).toBe(2); // mv1, aw1
      expect(mockPrisma.trackMediaVersion.updateMany).toHaveBeenCalled();
    });
  });
});
