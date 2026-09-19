import { Injectable } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";

@Injectable()
export class TrackArtworkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    trackId: string;
    originalObjectKey: string;
    mimeType: string;
  }) {
    return this.prisma.trackArtwork.create({
      data: {
        id: generateUuidV7(),
        trackId: data.trackId,
        originalObjectKey: data.originalObjectKey,
        mimeType: data.mimeType,
        width: 0,
        height: 0,
      },
    });
  }

  async findByTrackId(trackId: string) {
    return this.prisma.trackArtwork.findFirst({
      where: { trackId },
      orderBy: { createdAt: "desc" },
    });
  }
}
