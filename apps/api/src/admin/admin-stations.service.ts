import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@platform/database";
import { AdminStationSummary, QueueStatus, LiveSessionStatus } from "@platform/types";
import { AdminAuditLogsService } from "./admin-audit-logs.service";

@Injectable()
export class AdminStationsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  async getStations(query: { search?: string } = {}): Promise<{
    items: AdminStationSummary[];
    total: number;
  }> {
    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { stationName: { contains: query.search, mode: "insensitive" } },
        { slug: { contains: query.search, mode: "insensitive" } },
        { host: { user: { username: { contains: query.search, mode: "insensitive" } } } },
      ];
    }

    const stations = await this.prisma.station.findMany({
      where,
      include: {
        host: {
          include: {
            user: { select: { id: true, username: true, displayName: true } },
          },
        },
        liveSessions: {
          where: { status: LiveSessionStatus.LIVE },
          take: 1,
          include: {
            queueEntries: {
              where: { status: { in: [QueueStatus.QUEUED, QueueStatus.NEXT, QueueStatus.PLAYING] } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: AdminStationSummary[] = stations.map((s) => {
      const liveSession = s.liveSessions[0];
      const queue = liveSession?.queueEntries || [];
      const priorityQueueSize = queue.filter((q) => q.priorityRank > 0).length;
      const freeQueueSize = queue.filter((q) => q.priorityRank === 0).length;

      return {
        id: s.id,
        stationName: s.stationName,
        hostname: s.slug,
        hostId: s.host.user.id,
        hostUsername: s.host.user.username,
        hostDisplayName: s.host.user.displayName,
        status: s.status,
        isLive: Boolean(liveSession),
        currentLiveSessionId: liveSession?.id || null,
        activeQueueSize: queue.length,
        priorityQueueSize,
        freeQueueSize,
        submissionsEnabled: liveSession?.submissionsOpen ?? false,
        publicUrl: `/station/${s.slug}`,
        createdAt: s.createdAt.toISOString(),
      };
    });

    return { items, total: items.length };
  }

  async updateStation(
    id: string,
    adminUserId: string,
    data: { submissionsEnabled?: boolean; name?: string },
  ) {
    const station = await this.prisma.station.findUnique({
      where: { id },
      include: {
        liveSessions: {
          where: { status: LiveSessionStatus.LIVE },
          take: 1,
        },
      },
    });
    if (!station) throw new NotFoundException("Station not found");

    await this.prisma.$transaction(async (tx) => {
      if (data.name) {
        await tx.station.update({
          where: { id },
          data: { stationName: data.name },
        });
      }

      if (data.submissionsEnabled !== undefined && station.liveSessions[0]) {
        await tx.liveSession.update({
          where: { id: station.liveSessions[0].id },
          data: { submissionsOpen: data.submissionsEnabled },
        });
      }

      await this.auditLogsService.logAction({
        actingAdminUserId: adminUserId,
        actionType: "STATION_UPDATED",
        targetEntityType: "Station",
        targetEntityId: id,
        beforeState: { stationName: station.stationName },
        afterState: data,
        reason: "Administrative update",
      });
    });

    const updated = await this.prisma.station.findUnique({
      where: { id },
      include: {
        host: {
          include: {
            user: { select: { id: true, username: true, displayName: true } },
          },
        },
        liveSessions: {
          where: { status: LiveSessionStatus.LIVE },
          take: 1,
        },
      },
    });

    if (!updated) throw new NotFoundException("Station not found");

    const liveSession = updated.liveSessions[0];

    return {
      success: true,
      message: "Station updated successfully",
      station: {
        id: updated.id,
        stationName: updated.stationName,
        hostname: updated.slug,
        hostId: updated.host.user.id,
        hostUsername: updated.host.user.username,
        hostDisplayName: updated.host.user.displayName,
        status: updated.status,
        isLive: Boolean(liveSession),
        currentLiveSessionId: liveSession?.id || null,
        activeQueueSize: 0,
        priorityQueueSize: 0,
        freeQueueSize: 0,
        submissionsEnabled: liveSession?.submissionsOpen ?? false,
        publicUrl: `/station/${updated.slug}`,
        createdAt: updated.createdAt.toISOString(),
      },
    };
  }
}
