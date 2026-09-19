import { Test, TestingModule } from "@nestjs/testing";
import { TracksService } from "../tracks.service";
import { TrackRepository } from "../track.repository";
import { TrackMediaRepository } from "../track-media.repository";
import { TrackArtworkRepository } from "../track-artwork.repository";
import { UploadIntentRepository } from "../intents/upload-intent.repository";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { MediaProcessingQueueService } from "../media-processing-queue.service";
import { PrismaClient } from "@platform/database";
import {
  ProcessingState,
  UploadIntentStatus,
  UploadIntentType,
} from "@platform/types";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("TracksService", () => {
  let service: TracksService;

  const mockTrackRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findManyByUserId: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };

  const mockMediaRepo = {
    create: vi.fn(),
    findCurrentByTrackId: vi.fn(),
    updateState: vi.fn(),
    markAsNotCurrent: vi.fn(),
  };

  const mockArtworkRepo = {
    create: vi.fn(),
    findByTrackId: vi.fn(),
  };

  const mockIntentRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
  };

  const mockStorageService = {
    createPresignedUpload: vi.fn(),
    createPresignedDownload: vi.fn(),
    verifyObjectExists: vi.fn(),
  };

  const mockQueueService = {
    enqueueExtractAudioMetadata: vi.fn(),
    enqueueProcessArtwork: vi.fn(),
  };

  const mockPrismaClient = {
    artistIdentity: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TracksService,
        { provide: TrackRepository, useValue: mockTrackRepo },
        { provide: TrackMediaRepository, useValue: mockMediaRepo },
        { provide: TrackArtworkRepository, useValue: mockArtworkRepo },
        { provide: UploadIntentRepository, useValue: mockIntentRepo },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: MediaProcessingQueueService, useValue: mockQueueService },
        { provide: PrismaClient, useValue: mockPrismaClient },
      ],
    }).compile();

    service = module.get<TracksService>(TracksService);

    // Reset env vars before each test
    process.env.GLOBAL_UPLOAD_LIMIT_MB = "50";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createUploadUrl", () => {
    it("should throw BadRequestException if file is too large", async () => {
      await expect(
        service.createUploadUrl("user1", {
          songName: "Test",
          artistName: "Artist",
          originalFilename: "test.mp3",
          mimeType: "audio/mpeg",
          fileSize: 100 * 1024 * 1024, // 100MB
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should return presigned URL and track info with intent ID on success", async () => {
      mockPrismaClient.artistIdentity.findFirst.mockResolvedValue({
        id: "artist1",
      });
      mockTrackRepo.create.mockResolvedValue({ id: "track1" });
      mockStorageService.createPresignedUpload.mockResolvedValue({
        url: "https://example.com/upload",
        objectKey: "tracks/audio/123.mp3",
        expiresAt: new Date(),
      });
      mockIntentRepo.create.mockResolvedValue({ id: "intent1" });

      const result = await service.createUploadUrl("user1", {
        songName: "Test",
        artistName: "Artist",
        originalFilename: "test.mp3",
        mimeType: "audio/mpeg",
        fileSize: 10 * 1024 * 1024,
      });

      expect(result.trackId).toBe("track1");
      expect(result.uploadIntentId).toBe("intent1");
      expect(result.uploadUrl).toBe("https://example.com/upload");
      expect(mockTrackRepo.create).toHaveBeenCalled();
      expect(mockIntentRepo.create).toHaveBeenCalled();
    });
  });

  describe("completeUpload", () => {
    it("should throw NotFoundException if intent doesn't exist", async () => {
      mockIntentRepo.findById.mockResolvedValue(null);
      await expect(
        service.completeUpload("user1", "track1", "intent1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if intent is expired or not pending", async () => {
      mockIntentRepo.findById.mockResolvedValue({
        id: "intent1",
        userId: "user1",
        trackId: "track1",
        type: UploadIntentType.TRACK_AUDIO,
        status: UploadIntentStatus.COMPLETED,
        expiresAt: new Date(Date.now() + 10000),
      });
      await expect(
        service.completeUpload("user1", "track1", "intent1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should enqueue processing job and set PROCESSING state", async () => {
      mockIntentRepo.findById.mockResolvedValue({
        id: "intent1",
        userId: "user1",
        trackId: "track1",
        type: UploadIntentType.TRACK_AUDIO,
        status: UploadIntentStatus.PENDING,
        expiresAt: new Date(Date.now() + 10000),
        objectKey: "key",
        mimeType: "audio/mpeg",
        originalFilename: "test.mp3",
        fileSize: 1000,
      });
      mockTrackRepo.findById.mockResolvedValue({
        id: "track1",
        userId: "user1",
      });
      mockMediaRepo.findCurrentByTrackId.mockResolvedValue(null); // No current media
      mockStorageService.verifyObjectExists.mockResolvedValue(true);
      mockMediaRepo.create.mockResolvedValue({ id: "media1" });

      const result = await service.completeUpload("user1", "track1", "intent1");

      expect(result.success).toBe(true);
      expect(mockIntentRepo.updateStatus).toHaveBeenCalledWith(
        "intent1",
        UploadIntentStatus.PROCESSING,
      );
      expect(mockMediaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isCurrent: true, versionNumber: 1 }),
      );
      expect(mockQueueService.enqueueExtractAudioMetadata).toHaveBeenCalledWith(
        {
          trackId: "track1",
          mediaVersionId: "media1",
          ownerUserId: "user1",
          objectKey: "key",
        },
      );
    });
  });

  describe("completeArtworkUpload", () => {
    it("should throw NotFoundException if intent is invalid or wrong type", async () => {
      mockIntentRepo.findById.mockResolvedValue({
        id: "intent1",
        userId: "user1",
        trackId: "track1",
        type: UploadIntentType.TRACK_AUDIO, // Wrong type
        status: UploadIntentStatus.PENDING,
        expiresAt: new Date(Date.now() + 10000),
      });
      await expect(
        service.completeArtworkUpload("user1", "track1", "intent1"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
