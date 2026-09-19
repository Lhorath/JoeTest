import { Job } from "bullmq";
import { ExtractAudioMetadataPayload } from "@platform/types";
import { StorageService } from "../storage.service";
import * as mm from "music-metadata";
import crypto from "crypto";
import { PrismaClient } from "@platform/database";
import { ProcessingState } from "@platform/types";
import { AppLogger } from "@platform/logger";

export class AudioMetadataProcessor {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaClient,
    private readonly logger: AppLogger,
  ) {}

  async process(job: Job<ExtractAudioMetadataPayload>) {
    const { trackId, mediaVersionId, objectKey } = job.data;
    this.logger.info(
      `Extracting metadata for track ${trackId}, version ${mediaVersionId}`,
    );

    try {
      // 1. Get the object stream from storage
      const stream = await this.storageService.getObjectStream(objectKey);

      // 2. We need to calculate SHA256 while also parsing metadata.
      // The easiest robust way is to read the stream into a buffer if it's not huge,
      // or use streams. Since files can be up to 50MB, let's read into buffer for simplicity in this milestone.
      const buffer = await this.streamToBuffer(stream);

      const hash = crypto.createHash("sha256").update(buffer).digest("hex");

      // 3. Extract metadata using music-metadata
      const metadata = await mm.parseBuffer(buffer, "audio/mpeg", {
        duration: true,
      });

      const format = metadata.format;
      const durationSeconds = format.duration ? Math.round(format.duration) : 0;
      const bitrateBps = format.bitrate || null;
      const sampleRateHz = format.sampleRate || null;
      const channelCount = format.numberOfChannels || null;
      const audioCodec = format.codec || null;

      // 4. Atomic Database Update (Handling Audio Replacement Safety)
      await this.prisma.$transaction(async (tx: any) => {
        // Find existing current version
        const currentVersion = await tx.trackMediaVersion.findFirst({
          where: { trackId, isCurrent: true, id: { not: mediaVersionId } },
        });

        if (currentVersion) {
          // Mark old version not current
          await tx.trackMediaVersion.update({
            where: { id: currentVersion.id },
            data: { isCurrent: false },
          });
        }

        // Update the processing media version
        await tx.trackMediaVersion.update({
          where: { id: mediaVersionId },
          data: {
            durationSeconds,
            bitrateBps,
            sampleRateHz,
            channelCount,
            audioCodec,
            sha256Hash: hash,
            processingState: ProcessingState.READY,
            isCurrent: true,
          },
        });

        // Update Track level properties (BPM/Key could be extracted, but here we just update duration/state)
        // Only mark READY if we got valid duration
        const state =
          durationSeconds > 0 ? ProcessingState.READY : ProcessingState.FAILED;

        await tx.track.update({
          where: { id: trackId },
          data: {
            durationSeconds,
            processingState: state,
          },
        });
      });

      this.logger.info(
        `Successfully processed audio metadata for version ${mediaVersionId}`,
      );
      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Failed to extract audio metadata for version ${mediaVersionId}: ${error.message}`,
      );

      await this.prisma.$transaction(async (tx: any) => {
        await tx.trackMediaVersion.update({
          where: { id: mediaVersionId },
          data: {
            processingState: ProcessingState.FAILED,
            processingError: "Invalid or unsupported audio format",
          },
        });

        // Only mark track failed if this was the first/only media version
        const otherVersions = await tx.trackMediaVersion.count({
          where: { trackId, id: { not: mediaVersionId } },
        });

        if (otherVersions === 0) {
          await tx.track.update({
            where: { id: trackId },
            data: { processingState: ProcessingState.FAILED },
          });
        }
      });
      // Do not rethrow the error for permanent validation failures.
      // This stops BullMQ from retrying a job that will never succeed.
      return { success: false, error: "Invalid or unsupported audio format" };
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("error", (err) => reject(err));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }
}
