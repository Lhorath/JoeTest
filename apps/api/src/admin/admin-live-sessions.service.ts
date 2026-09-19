import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@platform/database";
import { AdminLiveSessionSummary, QueueStatus, LiveSessionStatus } from "@platform/types";

@Injectable()
export class AdminLiveSessionsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getLiveSessions(query: { status?: string; hostId?: string } = {}): Promise<{
    items: AdminLiveSessionSummary[];
    total: number;
  }> {
    const where: any = {};
    if (query.status) {
      where.status = query.status as LiveSessionStatus;
    }
    if (query.hostId) {
      where.hostId = query.hostId;
    }

    const sessions = await this.prisma.liveSession.findMany({
      where,
      include: {
        station: {
          include: {
            host: {
              include: {
                user: { select: { id: true, username: true } },
              },
            },
          },
        },
        _count: {
          select: {
            submissions: true,
            queueEntries: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: AdminLiveSessionSummary[] = sessions.map((s) => ({
      id: s.id,
      stationId: s.stationId,
      stationName: s.station.stationName,
      hostname: s.station.slug,
      hostId: s.station.host.user.id,
      hostUsername: s.station.host.user.username,
      status: s.status,
      startedAt: s.startedAt ? s.startedAt.toISOString() : s.createdAt.toISOString(),
      endedAt: s.endedAt ? s.endedAt.toISOString() : null,
      queueRevision: s.queueRevision,
      totalSubmissions: s._count.submissions,
      activeQueueCount: s._count.queueEntries,
      currentPlayingTrack: null,
      currentPlayingArtist: null,
      lastPlaybackActivityAt: s.lastPlaybackActivityAt ? s.lastPlaybackActivityAt.toISOString() : null,
    }));

    return { items, total: items.length };
  }

  async getLiveSessionDetail(id: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
      include: {
        station: {
          include: {
            host: {
              include: {
                user: { select: { id: true, username: true } },
              },
            },
          },
        },
        queueEntries: {
          orderBy: { sortOrder: "asc" },
          include: {
            submission: {
              include: {
                submittingUser: { select: { id: true, username: true } },
                trackSnapshot: true,
              },
            },
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!session) throw new NotFoundException("Live session not found");

    const activeEntries = session.queueEntries.filter(
      (q) => q.status === QueueStatus.QUEUED || q.status === QueueStatus.NEXT || q.status === QueueStatus.PLAYING,
    );

    return {
      id: session.id,
      stationId: session.stationId,
      stationName: session.station.stationName,
      hostname: session.station.slug,
      hostId: session.station.host.user.id,
      hostUsername: session.station.host.user.username,
      status: session.status,
      startedAt: session.startedAt ? session.startedAt.toISOString() : session.createdAt.toISOString(),
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
      queueRevision: session.queueRevision,
      totalSubmissions: session._count.submissions,
      activeQueueCount: activeEntries.length,
      currentPlayingTrack: null,
      currentPlayingArtist: null,
      lastPlaybackActivityAt: session.lastPlaybackActivityAt ? session.lastPlaybackActivityAt.toISOString() : null,
      queue: session.queueEntries.map((q) => ({
        id: q.id,
        songName: q.submission?.trackSnapshot?.songName || "Untitled Track",
        artistName: q.submission?.trackSnapshot?.artistName || "Unknown Artist",
        status: q.status,
        sortOrder: Number(q.sortOrder),
        isPriority: q.submission?.isPriority || false,
        priorityRank: q.priorityRank,
        submittingUsername: q.submission?.submittingUser?.username || "Unknown",
        submittedAt: q.submission?.submittedAt?.toISOString() || q.createdAt.toISOString(),
      })),
    };
  }
}
