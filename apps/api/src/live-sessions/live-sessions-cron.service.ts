import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaClient, endInactiveLiveSessions } from "@platform/database";
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
      const endedIds = await endInactiveLiveSessions(this.prisma);
      for (const sessionId of endedIds) {
        this.logger.log(`Session ${sessionId} AUTO_ENDED_INACTIVITY`);
        const updatedSession = await this.prisma.liveSession.findUnique({
          where: { id: sessionId },
        });
        if (updatedSession) {
          this.eventsService.emit(sessionId, "session.ended", {
            status: updatedSession.status,
            endedAt: updatedSession.endedAt,
            queueRevision: updatedSession.queueRevision,
            reason: "AUTO_ENDED_INACTIVITY",
          });
        }
      }
    } catch (error) {
      this.logger.error("Error running inactivity sweep", error);
    }
  }
}
