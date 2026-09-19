import { Job } from "bullmq";
import { ProcessArtworkPayload } from "@platform/types";
import { StorageService } from "../storage.service";
import { PrismaClient } from "@platform/database";
import { AppLogger } from "@platform/logger";
import sharp from "sharp";
import path from "path";

export class ArtworkProcessor {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaClient,
    private readonly logger: AppLogger,
  ) {}

  async process(job: Job<ProcessArtworkPayload>) {
    const { trackId, artworkId, objectKey } = job.data;
    this.logger.info(`Processing artwork ${artworkId} for track ${trackId}`);

    try {
      // 1. Get object stream
      const stream = await this.storageService.getObjectStream(objectKey);
      const buffer = await this.streamToBuffer(stream);

      // 2. Validate and get metadata with sharp
      const image = sharp(buffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error("Invalid image dimensions");
      }

      // 3. Generate thumbnail (e.g., 300x300, webp)
      const thumbnailBuffer = await image
        .resize(300, 300, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer();

      // 4. Generate master (e.g., max 1200x1200, webp)
      const masterBuffer = await image
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();

      // 5. Upload derivatives
      const dir = path.dirname(objectKey);
      const ext = path.extname(objectKey);
      const base = path.basename(objectKey, ext);

      const thumbnailObjectKey = `${dir}/${base}-thumb.webp`;
      const masterObjectKey = `${dir}/${base}-master.webp`;

      await this.storageService.uploadObject(
        thumbnailObjectKey,
        thumbnailBuffer,
        "image/webp",
      );
      await this.storageService.uploadObject(
        masterObjectKey,
        masterBuffer,
        "image/webp",
      );

      // 6. Generate Blurhash (simulated for this milestone)
      const blurHash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj"; // Static placeholder for now

      // 7. Update database
      await this.prisma.trackArtwork.update({
        where: { id: artworkId },
        data: {
          width: metadata.width,
          height: metadata.height,
          thumbnailObjectKey,
          masterObjectKey,
          blurHash,
          mimeType: "image/webp", // we converted it
        },
      });

      this.logger.info(`Successfully processed artwork ${artworkId}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Failed to process artwork ${artworkId}: ${error.message}`,
      );
      // Note: We don't fail the track here, just log the artwork failure.
      // In a more complex system we might mark the artwork itself as FAILED.
      throw error;
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
