import { Module } from "@nestjs/common";
import { TracksController } from "./tracks.controller";
import { TracksService } from "./tracks.service";
import { TrackRepository } from "./track.repository";
import { TrackMediaRepository } from "./track-media.repository";
import { TrackArtworkRepository } from "./track-artwork.repository";
import { StorageModule } from "../storage/storage.module";
import { AuthModule } from "../auth/auth.module";
import { PrismaClient } from "@platform/database";
import { BullModule } from "@nestjs/bullmq";
import {
  MEDIA_PROCESSING_QUEUE,
  MediaProcessingQueueService,
} from "./media-processing-queue.service";
import { UploadIntentRepository } from "./intents/upload-intent.repository";

@Module({
  imports: [
    StorageModule,
    AuthModule,
    BullModule.registerQueue({
      name: MEDIA_PROCESSING_QUEUE,
    }),
  ],
  controllers: [TracksController],
  providers: [
    TracksService,
    TrackRepository,
    TrackMediaRepository,
    TrackArtworkRepository,
    MediaProcessingQueueService,
    UploadIntentRepository,
    PrismaClient,
  ],
  exports: [TracksService],
})
export class TracksModule {}
