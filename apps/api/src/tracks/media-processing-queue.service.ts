import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  MediaJobName,
  ExtractAudioMetadataPayload,
  ProcessArtworkPayload,
  DeleteMediaObjectsPayload,
  DeleteUserMediaPayload,
} from "@platform/types";

export const MEDIA_PROCESSING_QUEUE = "media-processing";

@Injectable()
export class MediaProcessingQueueService {
  constructor(
    @InjectQueue(MEDIA_PROCESSING_QUEUE) private readonly mediaQueue: Queue,
  ) {}

  async enqueueExtractAudioMetadata(payload: ExtractAudioMetadataPayload) {
    // Generate an idempotent job ID based on media version and operation
    const jobId = `${MediaJobName.EXTRACT_AUDIO_METADATA}:${payload.mediaVersionId}`;

    await this.mediaQueue.add(MediaJobName.EXTRACT_AUDIO_METADATA, payload, {
      jobId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });
  }

  async enqueueProcessArtwork(payload: ProcessArtworkPayload) {
    // Generate an idempotent job ID based on artwork record and operation
    const jobId = `${MediaJobName.PROCESS_ARTWORK}:${payload.artworkId}`;

    await this.mediaQueue.add(MediaJobName.PROCESS_ARTWORK, payload, {
      jobId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });
  }

  async enqueueDeleteMediaObjects(payload: DeleteMediaObjectsPayload) {
    const jobId = `${MediaJobName.DELETE_MEDIA_OBJECTS}:${payload.correlationId || Date.now()}`;

    await this.mediaQueue.add(MediaJobName.DELETE_MEDIA_OBJECTS, payload, {
      jobId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });
  }

  async enqueueDeleteUserMedia(payload: DeleteUserMediaPayload) {
    const jobId = `${MediaJobName.DELETE_USER_MEDIA}:${payload.ownerUserId}:${payload.correlationId || Date.now()}`;

    await this.mediaQueue.add(MediaJobName.DELETE_USER_MEDIA, payload, {
      jobId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });
  }
}
