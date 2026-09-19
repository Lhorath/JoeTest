import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaClient } from "@platform/database";
import {
  StorageStatus,
  ProcessingState,
  QueueStatus,
  AdminMediaFilterDto,
  AdminMediaSummary,
  AdminStorageCleanupReport,
  AdminStorageCleanupCandidate,
} from "@platform/types";
import { MediaProcessingQueueService } from "../tracks/media-processing-queue.service";
import { AdminAuditLogsService } from "./admin-audit-logs.service";

@Injectable()
export class AdminTracksService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly mediaProcessingQueue: MediaProcessingQueueService,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  async getMediaSummaries(filter: AdminMediaFilterDto = {}): Promise<{
    items: AdminMediaSummary[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (filter.ownerUserId) {
      where.userId = filter.ownerUserId;
    }
    if (filter.isPlayed !== undefined) {
      if (filter.isPlayed) {
        where.lastPlayedAt = { not: null };
      } else {
        where.lastPlayedAt = null;
      }
    }
    if (filter.storageStatus) {
      where.mediaVersions = { some: { storageStatus: filter.storageStatus } };
    }
    if (filter.search) {
      where.OR = [
        { songName: { contains: filter.search, mode: "insensitive" } },
        { artistIdentity: { artistName: { contains: filter.search, mode: "insensitive" } } },
        { user: { username: { contains: filter.search, mode: "insensitive" } } },
      ];
    }
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
    }

    const [total, tracks] = await Promise.all([
      this.prisma.track.count({ where }),
      this.prisma.track.findMany({
        where,
        include: {
          artistIdentity: true,
          user: { select: { id: true, username: true } },
          mediaVersions: { where: { isCurrent: true } },
          submissions: {
            include: {
              queueEntry: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const items: AdminMediaSummary[] = tracks.map((track) => {
      const currentMedia = track.mediaVersions[0];
      const activeQueueCount = track.submissions.filter(
        (s) =>
          s.queueEntry &&
          (s.queueEntry.status === QueueStatus.QUEUED ||
            s.queueEntry.status === QueueStatus.NEXT ||
            s.queueEntry.status === QueueStatus.PLAYING),
      ).length;

      return {
        id: track.id,
        trackId: track.id,
        songName: track.songName,
        artistName: track.artistIdentity?.artistName || "Unknown Artist",
        ownerUserId: track.userId,
        ownerUsername: track.user?.username || "Unknown",
        storageStatus: currentMedia?.storageStatus || StorageStatus.AVAILABLE,
        playbackCapability: track.playbackCapability,
        durationSeconds: track.durationSeconds,
        fileSizeBytes: currentMedia?.fileSize ? Number(currentMedia.fileSize) : null,
        activeQueueCount,
        submissionCount: track.submissions.length,
        lastPlayedAt: track.lastPlayedAt ? track.lastPlayedAt.toISOString() : null,
        createdAt: track.createdAt.toISOString(),
      };
    });

    return { items, total, page, limit };
  }

  /**
   * Safe media deletion:
   * 1. Checks if track is actively in queue (status in QUEUED, NEXT, PLAYING)
   * 2. Preserves historical SubmissionTrackSnapshot rows untouched!
   * 3. Soft deletes and enqueues object deletion
   * 4. Logs to AdminAuditLog
   */
  async deleteMediaWithSafeguards(
    trackId: string,
    adminUserId: string,
    options: { purgeS3?: boolean; reason?: string } = {},
  ) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: {
        mediaVersions: true,
        artworks: true,
        submissions: {
          include: { queueEntry: true },
        },
      },
    });

    if (!track) throw new NotFoundException("Track not found");

    const activeInQueue = track.submissions.some(
      (s) =>
        s.queueEntry &&
        (s.queueEntry.status === QueueStatus.QUEUED ||
          s.queueEntry.status === QueueStatus.NEXT ||
          s.queueEntry.status === QueueStatus.PLAYING),
    );

    if (activeInQueue) {
      throw new BadRequestException(
        "Cannot delete media: Track is currently referenced in an active live queue.",
      );
    }

    const objectKeys: string[] = [];
    const mediaVersionIds: string[] = [];
    const artworkIds: string[] = [];

    for (const mv of track.mediaVersions) {
      if (mv.storageStatus === StorageStatus.AVAILABLE) {
        objectKeys.push(mv.originalObjectKey);
        if (mv.processedObjectKey) objectKeys.push(mv.processedObjectKey);
        mediaVersionIds.push(mv.id);
      }
    }

    for (const art of track.artworks) {
      if (art.storageStatus === StorageStatus.AVAILABLE) {
        objectKeys.push(art.originalObjectKey);
        if (art.masterObjectKey) objectKeys.push(art.masterObjectKey);
        if (art.thumbnailObjectKey) objectKeys.push(art.thumbnailObjectKey);
        artworkIds.push(art.id);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft-delete the track
      await tx.track.update({
        where: { id: trackId },
        data: { deletedAt: new Date() },
      });

      if (mediaVersionIds.length > 0) {
        await tx.trackMediaVersion.updateMany({
          where: { id: { in: mediaVersionIds } },
          data: { storageStatus: StorageStatus.DELETION_PENDING },
        });
      }

      if (artworkIds.length > 0) {
        await tx.trackArtwork.updateMany({
          where: { id: { in: artworkIds } },
          data: { storageStatus: StorageStatus.DELETION_PENDING },
        });
      }

      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "TRACK_MEDIA_DELETED",
        targetEntityType: "Track",
        targetEntityId: trackId,
        reason: options.reason || "Administrative media moderation",
      });
    });

    if (options.purgeS3 && objectKeys.length > 0) {
      await this.mediaProcessingQueue.enqueueDeleteMediaObjects({ objectKeys });
    }

    return {
      success: true,
      message: "Media removed with snapshots preserved",
      trackId,
    };
  }

  /**
   * Storage cleanup dry-run report
   */
  async getStorageCleanupReport(): Promise<AdminStorageCleanupReport> {
    const now = new Date();

    const deletionPendingMedia = await this.prisma.trackMediaVersion.findMany({
      where: { storageStatus: StorageStatus.DELETION_PENDING },
      include: {
        track: {
          include: {
            user: { select: { username: true } },
            submissions: {
              include: { queueEntry: true },
            },
          },
        },
      },
      take: 100,
    });

    const candidates: AdminStorageCleanupCandidate[] = deletionPendingMedia.map((m) => {
      const activeQueueCount = (m.track?.submissions || []).filter(
        (s) =>
          s.queueEntry &&
          (s.queueEntry.status === QueueStatus.QUEUED ||
            s.queueEntry.status === QueueStatus.NEXT ||
            s.queueEntry.status === QueueStatus.PLAYING),
      ).length;

      return {
        trackId: m.trackId,
        songName: m.track?.songName || "Unknown",
        ownerUsername: m.track?.user?.username || "Unknown",
        storageStatus: m.storageStatus,
        reason: "Marked DELETION_PENDING",
        canSafelyDelete: activeQueueCount === 0,
        activeQueueCount,
      };
    });

    const eligibleForPurgeCount = candidates.filter((c) => c.canSafelyDelete).length;
    const blockedByActiveQueueCount = candidates.filter((c) => !c.canSafelyDelete).length;

    return {
      generatedAt: now.toISOString(),
      totalCandidateTracks: candidates.length,
      eligibleForPurgeCount,
      blockedByActiveQueueCount,
      candidates,
    };
  }

  /**
   * Purge storage candidates (requires explicit confirmation)
   */
  async purgeStorageCandidates(adminUserId: string, confirmed: boolean) {
    if (!confirmed) {
      throw new BadRequestException("Storage purge requires explicit admin confirmation");
    }

    const pendingMedia = await this.prisma.trackMediaVersion.findMany({
      where: { storageStatus: StorageStatus.DELETION_PENDING },
      select: { originalObjectKey: true, processedObjectKey: true },
      take: 200,
    });

    const objectKeys: string[] = [];
    for (const m of pendingMedia) {
      if (m.originalObjectKey) objectKeys.push(m.originalObjectKey);
      if (m.processedObjectKey) objectKeys.push(m.processedObjectKey);
    }

    if (objectKeys.length > 0) {
      await this.mediaProcessingQueue.enqueueDeleteMediaObjects({ objectKeys });
    }

    await this.auditLogsService.logAction({
      actingAdminUserId: adminUserId,
      actionType: "STORAGE_CLEANUP_PURGED",
      targetEntityType: "Storage",
      targetEntityId: "s3_bulk_cleanup",
      afterState: { purgedCount: objectKeys.length },
      reason: "Administrative batch storage cleanup execution",
    });

    return {
      success: true,
      purgedCount: objectKeys.length,
      message: `Enqueued ${objectKeys.length} objects for permanent deletion`,
    };
  }

  // Backwards compatibility for existing admin tracks endpoints
  async getAdminTracks(query: any) {
    const res = await this.getMediaSummaries(query);
    return res.items.map((i) => ({
      id: i.id,
      title: i.songName,
      artist: i.artistName,
      owner: { id: i.ownerUserId, username: i.ownerUsername },
      fileSize: i.fileSizeBytes || 0,
      storageStatus: i.storageStatus,
      processingState: ProcessingState.READY,
      uploadDate: i.createdAt,
      lastPlayedAt: i.lastPlayedAt,
    }));
  }

  async deleteTrackMedia(trackId: string) {
    return this.deleteMediaWithSafeguards(trackId, "system", { purgeS3: true });
  }

  async deleteArtwork(artworkId: string) {
    const artwork = await this.prisma.trackArtwork.findUnique({ where: { id: artworkId } });
    if (!artwork) throw new NotFoundException("Artwork not found");
    await this.prisma.trackArtwork.update({
      where: { id: artworkId },
      data: { storageStatus: StorageStatus.DELETION_PENDING },
    });
    return { success: true };
  }

  async deleteMediaObject(objectKey: string) {
    await this.mediaProcessingQueue.enqueueDeleteMediaObjects({ objectKeys: [objectKey] });
    return { success: true };
  }

  async deleteUserMedia(userId: string) {
    await this.mediaProcessingQueue.enqueueDeleteUserMedia({ ownerUserId: userId });
    return { success: true };
  }
}
