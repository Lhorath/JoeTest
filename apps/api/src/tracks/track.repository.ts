import { Injectable } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import {
  TrackSourceType,
  PlaybackCapability,
  ProcessingState,
} from "@platform/types";

@Injectable()
export class TrackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    userId: string;
    artistIdentityId: string;
    songName: string;
    albumName?: string;
    explicitContent?: boolean;
    bpm?: number;
    musicalKey?: string;
  }) {
    return this.prisma.track.create({
      data: {
        id: generateUuidV7(),
        userId: data.userId,
        artistIdentityId: data.artistIdentityId,
        songName: data.songName,
        normalizedSongName: data.songName.toLowerCase().trim(),
        albumName: data.albumName,
        explicitContent: data.explicitContent || false,
        sourceType: TrackSourceType.UPLOADED_AUDIO,
        playbackCapability: PlaybackCapability.NATIVE_AUDIO,
        processingState: ProcessingState.UPLOADING,
        bpm: data.bpm,
        musicalKey: data.musicalKey,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.track.findUnique({
      where: { id },
      include: {
        artistIdentity: true,
        mediaVersions: {
          where: { isCurrent: true },
        },
        artworks: true,
      },
    });
  }

  async findManyByUserId(userId: string) {
    return this.prisma.track.findMany({
      where: { userId, deletedAt: null },
      include: {
        artistIdentity: true,
        mediaVersions: {
          where: { isCurrent: true },
        },
        artworks: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async search(userId: string, query: string) {
    const normalizedQuery = query.toLowerCase().trim();
    return this.prisma.track.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { normalizedSongName: { contains: normalizedQuery } },
          {
            artistIdentity: {
              normalizedArtistName: { contains: normalizedQuery },
            },
          },
        ],
      },
      include: {
        artistIdentity: true,
        mediaVersions: {
          where: { isCurrent: true },
        },
        artworks: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, data: any) {
    if (data.songName) {
      data.normalizedSongName = data.songName.toLowerCase().trim();
    }
    return this.prisma.track.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.track.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
