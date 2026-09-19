import { Job } from "bullmq";
import {
  DeleteMediaObjectsPayload,
  DeleteUserMediaPayload,
  StorageStatus,
} from "@platform/types";
import { StorageService } from "../storage.service";
import { PrismaClient } from "@platform/database";
import { AppLogger } from "@platform/logger";

export class MediaDeletionProcessor {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaClient,
    private readonly logger: AppLogger,
  ) {}

  async processDeleteMediaObjects(job: Job<DeleteMediaObjectsPayload>) {
    const { objectKeys } = job.data;
    this.logger.info(`Processing deletion for ${objectKeys.length} objects`);

    const failedKeys: string[] = [];

    for (const key of objectKeys) {
      try {
        await this.storageService.deleteObject(key);
        // Note: For true consistency we might want to track completion per-key,
        // but for this milestone we can bulk-update them in the DB after.
      } catch (error: any) {
        this.logger.warn(
          `Failed to delete object from storage: ${key} - ${error.message}`,
        );
        // We accumulate failed keys to avoid throwing immediately and stopping the batch
        failedKeys.push(key);
      }
    }

    const successfulKeys = objectKeys.filter((k) => !failedKeys.includes(k));

    if (successfulKeys.length > 0) {
      await this.prisma.$transaction(async (tx: any) => {
        await tx.trackMediaVersion.updateMany({
          where: {
            OR: [
              { originalObjectKey: { in: successfulKeys } },
              { processedObjectKey: { in: successfulKeys } },
            ],
          },
          data: { storageStatus: StorageStatus.DELETED },
        });

        await tx.trackArtwork.updateMany({
          where: {
            OR: [
              { originalObjectKey: { in: successfulKeys } },
              { masterObjectKey: { in: successfulKeys } },
              { thumbnailObjectKey: { in: successfulKeys } },
            ],
          },
          data: { storageStatus: StorageStatus.DELETED },
        });
      });
    }

    if (failedKeys.length > 0) {
      throw new Error(
        `Failed to delete ${failedKeys.length} objects from storage. Keys: ${failedKeys.join(", ")}`,
      );
    }

    this.logger.info(`Successfully deleted ${successfulKeys.length} objects.`);
    return { success: true, deletedCount: successfulKeys.length };
  }

  async processDeleteUserMedia(job: Job<DeleteUserMediaPayload>) {
    const { ownerUserId } = job.data;
    this.logger.info(`Processing user media deletion for user ${ownerUserId}`);

    const tracks = await this.prisma.track.findMany({
      where: { userId: ownerUserId },
      include: { mediaVersions: true, artworks: true },
    });

    const objectKeysToQueue: string[] = [];

    for (const track of tracks) {
      for (const mv of track.mediaVersions) {
        if (
          mv.storageStatus === StorageStatus.AVAILABLE ||
          mv.storageStatus === StorageStatus.DELETION_PENDING
        ) {
          objectKeysToQueue.push(mv.originalObjectKey);
          if (mv.processedObjectKey)
            objectKeysToQueue.push(mv.processedObjectKey);
        }
      }

      for (const art of track.artworks) {
        if (
          art.storageStatus === StorageStatus.AVAILABLE ||
          art.storageStatus === StorageStatus.DELETION_PENDING
        ) {
          objectKeysToQueue.push(art.originalObjectKey);
          if (art.masterObjectKey) objectKeysToQueue.push(art.masterObjectKey);
          if (art.thumbnailObjectKey)
            objectKeysToQueue.push(art.thumbnailObjectKey);
        }
      }
    }

    // Rather than deleting synchronously, we enqueue standard DELETE_MEDIA_OBJECTS jobs in chunks
    const CHUNK_SIZE = 10;

    // We update status to DELETION_PENDING first
    await this.prisma.$transaction(async (tx: any) => {
      const trackIds = tracks.map((t: any) => t.id);

      if (trackIds.length > 0) {
        await tx.trackMediaVersion.updateMany({
          where: {
            trackId: { in: trackIds },
            storageStatus: { not: StorageStatus.DELETED },
          },
          data: { storageStatus: StorageStatus.DELETION_PENDING },
        });
        await tx.trackArtwork.updateMany({
          where: {
            trackId: { in: trackIds },
            storageStatus: { not: StorageStatus.DELETED },
          },
          data: { storageStatus: StorageStatus.DELETION_PENDING },
        });
      }
    });

    // Note: Since this worker process cannot easily enqueue jobs back to the Bull queue
    // cleanly without importing the Queue logic, we will instead just process them in chunks right here.
    // It's still asynchronous relative to the API caller.

    let totalDeleted = 0;
    for (let i = 0; i < objectKeysToQueue.length; i += CHUNK_SIZE) {
      const chunk = objectKeysToQueue.slice(i, i + CHUNK_SIZE);
      // We reuse the other function, but wrap it in a pseudo job object
      const result = await this.processDeleteMediaObjects({
        data: { objectKeys: chunk },
      } as Job<DeleteMediaObjectsPayload>);
      totalDeleted += result.deletedCount;
    }

    this.logger.info(
      `Successfully processed user media deletion for user ${ownerUserId}. Total items deleted: ${totalDeleted}`,
    );
    return { success: true, totalDeleted };
  }
}
