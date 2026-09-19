import { Injectable } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import { ProcessingState } from "@platform/types";

@Injectable()
export class TrackMediaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    trackId: string;
    originalObjectKey: string;
    mimeType: string;
    originalFilename: string;
    fileSize: number;
    versionNumber: number;
    isCurrent?: boolean;
  }) {
    return this.prisma.trackMediaVersion.create({
      data: {
        id: generateUuidV7(),
        trackId: data.trackId,
        originalObjectKey: data.originalObjectKey,
        mimeType: data.mimeType,
        originalFilename: data.originalFilename,
        fileSize: data.fileSize,
        durationSeconds: 0,
        versionNumber: data.versionNumber,
        isCurrent: data.isCurrent ?? true,
        processingState: ProcessingState.UPLOADING,
      },
    });
  }

  async findCurrentByTrackId(trackId: string) {
    return this.prisma.trackMediaVersion.findFirst({
      where: { trackId, isCurrent: true },
      orderBy: { versionNumber: "desc" },
    });
  }

  async updateState(id: string, state: ProcessingState, error?: string) {
    return this.prisma.trackMediaVersion.update({
      where: { id },
      data: { processingState: state, processingError: error },
    });
  }

  async markAsNotCurrent(trackId: string) {
    return this.prisma.trackMediaVersion.updateMany({
      where: { trackId, isCurrent: true },
      data: { isCurrent: false },
    });
  }
}
