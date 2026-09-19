import { Injectable } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import { UploadIntentStatus, UploadIntentType } from "@platform/types";

@Injectable()
export class UploadIntentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    userId: string;
    trackId: string;
    type: UploadIntentType;
    objectKey: string;
    mimeType: string;
    originalFilename: string;
    fileSize?: number;
    expiresInSeconds: number;
  }) {
    const expiresAt = new Date(Date.now() + data.expiresInSeconds * 1000);

    return this.prisma.uploadIntent.create({
      data: {
        id: generateUuidV7(),
        userId: data.userId,
        trackId: data.trackId,
        type: data.type,
        objectKey: data.objectKey,
        mimeType: data.mimeType,
        originalFilename: data.originalFilename,
        fileSize: data.fileSize,
        expiresAt,
        status: UploadIntentStatus.PENDING,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.uploadIntent.findUnique({
      where: { id },
    });
  }

  async updateStatus(id: string, status: UploadIntentStatus) {
    return this.prisma.uploadIntent.update({
      where: { id },
      data: {
        status,
        ...(status === UploadIntentStatus.COMPLETED
          ? { completedAt: new Date() }
          : {}),
      },
    });
  }
}
