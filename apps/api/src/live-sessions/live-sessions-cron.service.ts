import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaClient } from "@platform/database";
import { LiveSessionStatus } from "@platform/types";
import { LiveSessionsEventService } from "./live-sessions-event.service";

@Injectable()
export class LiveSessionsCronService {
  private readonly logger = new Logger(LiveSessionsCronService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventsService: LiveSessionsEventService
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleInactivitySweep() {
    this.logger.log("Running inactivity sweep for LiveSessions...");

    try {
      const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);

      const updatedSessions = await this.prisma.liveSession.findMany({
        where: {
          status: LiveSessionStatus.LIVE,
          lastPlaybackActivityAt: {
            lt: sixtyMinutesAgo,
          }
        },
      });

      if (updatedSessions.length === 0) {
        return;
      }

      for (const session of updatedSessions) {
        const result = await this.prisma.liveSession.updateMany({
          where: {
            id: session.id,
            status: LiveSessionStatus.LIVE,
            lastPlaybackActivityAt: {
              lt: sixtyMinutesAgo,
            },
          },
          data: {
            status: LiveSessionStatus.ENDED,
            endedAt: new Date(),
            queueRevision: { increment: 1 },
          },
        });

        if (result.count > 0) {
          this.logger.log(`Session ${session.id} auto-ended due to inactivity.`);

          const updatedSession = await this.prisma.liveSession.findUnique({ where: { id: session.id } });
          if (updatedSession) {
             this.eventsService.emit(session.id, "session.ended", {
               status: updatedSession.status,
               endedAt: updatedSession.endedAt,
               queueRevision: updatedSession.queueRevision,
             });
          }
        }
      }
    } catch (error) {
      this.logger.error("Error running inactivity sweep", error);
    }
  }
}
