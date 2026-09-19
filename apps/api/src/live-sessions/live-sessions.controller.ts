import { HostManualTierChangeDto } from "./dto/live-session.dto";
import { UpdateLiveSessionConfigDto } from "./dto/update-live-session-config.dto";
import {
  Patch,
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { LiveSessionsService } from "./live-sessions.service";
import {
  CreateLiveSessionDto,
  ExpectedQueueRevisionDto,
  AddQueueEntryDto,
  PlayNextDto,
  MoveToNextDto,
  LoadQueueEntryDto,
  ClearPlayerDto,
  QueueEntryActionDto,
} from "./dto/live-session.dto";
import { SessionGuard } from "../auth/guards/session.guard";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";
import { PublicRoute } from "../auth/decorators/auth.decorators";

@Controller("live-sessions")
@UseGuards(SessionGuard)
export class LiveSessionsController {
  constructor(private readonly liveSessionsService: LiveSessionsService) {}

  @PublicRoute()
  @Get("public")
  async getPublicLiveSessions() {
    return this.liveSessionsService.getPublicLiveSessions();
  }

  @PublicRoute()
  @Get(":id/public")
  async getPublicLiveSession(@Param("id") id: string) {
    return this.liveSessionsService.getPublicLiveSession(id);
  }

  @PublicRoute()
  @Get(":id/queue/public")
  async getPublicQueue(@Param("id") id: string) {
    return this.liveSessionsService.getPublicQueue(id);
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateLiveSessionDto) {

    return this.liveSessionsService.createLiveSession(req.user.id, dto);
  }

  @Get(":id")
  async get(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.liveSessionsService.getLiveSession(req.user.id, id);
  }

  @Post(":id/start")
  async start(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: ExpectedQueueRevisionDto,
  ) {
    return this.liveSessionsService.startLiveSession(
      req.user.id,
      id,
      dto.expectedQueueRevision,
    );
  }

  @Post(":id/pause")
  async pause(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: ExpectedQueueRevisionDto,
  ) {
    return this.liveSessionsService.pauseLiveSession(
      req.user.id,
      id,
      dto.expectedQueueRevision,
    );
  }

  @Post(":id/resume")
  async resume(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: ExpectedQueueRevisionDto,
  ) {
    return this.liveSessionsService.resumeLiveSession(
      req.user.id,
      id,
      dto.expectedQueueRevision,
    );
  }

  @Post(":id/end")
  async end(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: ExpectedQueueRevisionDto,
  ) {
    return this.liveSessionsService.endLiveSession(
      req.user.id,
      id,
      dto.expectedQueueRevision,
    );
  }

  @Post(":id/queue/entries")
  async addQueueEntry(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: AddQueueEntryDto,
  ) {
    return this.liveSessionsService.addQueueEntry(req.user.id, id, dto);
  }

  @Get(":id/queue")
  async getQueue(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.liveSessionsService.getQueue(req.user.id, id);
  }

  @Post(":id/queue/play-next")
  async playNext(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: PlayNextDto,
  ) {
    return this.liveSessionsService.playNext(
      req.user.id,
      id,
      dto.expectedQueueRevision,
    );
  }

  @Post(":id/queue/entries/:entryId/move-to-next")
  async moveToNext(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Param("entryId") entryId: string,
    @Body() dto: MoveToNextDto,
  ) {
    return this.liveSessionsService.moveToNext(
      req.user.id,
      id,
      entryId,
      dto.expectedQueueRevision,
    );
  }

  @Post(":id/queue/entries/:entryId/load")
  async loadQueueEntry(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Param("entryId") entryId: string,
    @Body() dto: LoadQueueEntryDto,
  ) {
    return this.liveSessionsService.loadQueueEntry(
      req.user.id,
      id,
      entryId,
      dto.expectedQueueRevision,
    );
  }

  @Post(":id/queue/player/clear")
  async clearPlayer(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: ClearPlayerDto,
  ) {
    return this.liveSessionsService.clearPlayer(
      req.user.id,
      id,
      dto.expectedQueueRevision,
    );
  }

  @Patch(":id/configuration")
  async updateConfiguration(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdateLiveSessionConfigDto,
  ) {
    return this.liveSessionsService.updateConfiguration(req.user.id, id, dto);
  }

  @Post(":id/queue/entries/:entryId/tier")
  async changeEntryTier(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Param("entryId") entryId: string,
    @Body() dto: HostManualTierChangeDto,
  ) {
    return this.liveSessionsService.changeEntryTier(
      req.user.id,
      id,
      entryId,
      dto,
    );
  }

  @Post(":id/queue/entries/:entryId")
  async handleQueueEntryAction(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Param("entryId") entryId: string,
    @Body() dto: QueueEntryActionDto,
  ) {
    if (dto.action === "COMPLETE") {
      return this.liveSessionsService.completeQueueEntry(
        req.user.id,
        id,
        entryId,
        dto.expectedQueueRevision,
      );
    }
    return this.liveSessionsService.skipQueueEntry(
      req.user.id,
      id,
      entryId,
      dto.expectedQueueRevision,
    );
  }

  @Delete(":id/queue/entries/:entryId")
  async removeQueueEntry(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Param("entryId") entryId: string,
    @Query("expectedQueueRevision") expectedQueueRevisionStr?: string,
  ) {
    const expectedQueueRevision = expectedQueueRevisionStr
      ? parseInt(expectedQueueRevisionStr, 10)
      : undefined;
    return this.liveSessionsService.removeQueueEntry(
      req.user.id,
      id,
      entryId,
      expectedQueueRevision,
    );
  }

  @PublicRoute()
  @Get(":id/weekly-top3")
  async getWeeklyTop3(
    @Param("id") id: string,
    @Query("date") dateParam?: string,
  ) {
    const refDate = dateParam ? new Date(dateParam) : new Date();
    return this.liveSessionsService.getWeeklyTop3(id, refDate);
  }
}
