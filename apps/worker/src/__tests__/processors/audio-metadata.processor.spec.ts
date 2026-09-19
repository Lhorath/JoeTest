import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioMetadataProcessor } from "../../processors/audio-metadata.processor";
import { ProcessingState } from "@platform/types";
import { Readable } from "stream";

vi.mock("music-metadata", () => ({
  parseBuffer: vi.fn().mockResolvedValue({
    format: {
      duration: 120,
      bitrate: 128000,
      sampleRate: 44100,
      numberOfChannels: 2,
      codec: "MPEG 1 Layer 3",
    },
  }),
}));

describe("AudioMetadataProcessor", () => {
  let processor: AudioMetadataProcessor;

  const mockStorageService = {
    getObjectStream: vi.fn(),
    uploadObject: vi.fn(),
  };

  const mockPrisma = {
    $transaction: vi.fn((cb) => cb(mockPrisma)),
    trackMediaVersion: {
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    track: {
      update: vi.fn(),
    },
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new AudioMetadataProcessor(
      mockStorageService as any,
      mockPrisma as any,
      mockLogger as any,
    );
  });

  it("should extract metadata and update database successfully", async () => {
    const job = {
      data: {
        trackId: "track1",
        mediaVersionId: "media1",
        ownerUserId: "user1",
        objectKey: "test.mp3",
      },
    };

    const mockStream = new Readable({
      read() {
        this.push(Buffer.from("fake-audio-data"));
        this.push(null);
      },
    });

    mockStorageService.getObjectStream.mockResolvedValue(mockStream);
    mockPrisma.trackMediaVersion.findFirst.mockResolvedValue(null);

    const result = await processor.process(job as any);

    expect(result.success).toBe(true);
    expect(mockPrisma.trackMediaVersion.update).toHaveBeenCalledWith({
      where: { id: "media1" },
      data: expect.objectContaining({
        durationSeconds: 120,
        processingState: ProcessingState.READY,
        isCurrent: true,
      }),
    });
    expect(mockPrisma.track.update).toHaveBeenCalledWith({
      where: { id: "track1" },
      data: {
        durationSeconds: 120,
        processingState: ProcessingState.READY,
      },
    });
  });
});
