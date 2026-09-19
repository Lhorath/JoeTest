import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from "@nestjs/common";
import { TracksService } from "./tracks.service";
import {
  CreateTrackUploadUrlDto,
  UpdateTrackDto,
  ReplaceTrackAudioUrlDto,
  CreateArtworkUploadUrlDto,
  SearchTrackDto,
} from "./dto/track.dto";
import { SessionGuard } from "../auth/guards/session.guard";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";

@Controller("tracks")
@UseGuards(SessionGuard)
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Post("upload-url")
  async getUploadUrl(
    @Req() req: RequestWithUser,
    @Body() dto: CreateTrackUploadUrlDto,
  ) {
    return this.tracksService.createUploadUrl(req.user.id, dto);
  }

  @Post(":id/upload-complete")
  async completeUpload(
    @Req() req: RequestWithUser,
    @Param("id") trackId: string,
    @Body() body: { uploadIntentId: string },
  ) {
    return this.tracksService.completeUpload(
      req.user.id,
      trackId,
      body.uploadIntentId,
    );
  }

  @Get()
  async getTracks(@Req() req: RequestWithUser) {
    return this.tracksService.getTracks(req.user.id);
  }

  @Get("search")
  async searchTracks(
    @Req() req: RequestWithUser,
    @Query() query: SearchTrackDto,
  ) {
    return this.tracksService.searchTracks(req.user.id, query.query);
  }

  @Get(":id")
  async getTrack(@Req() req: RequestWithUser, @Param("id") trackId: string) {
    return this.tracksService.getTrack(req.user.id, trackId);
  }

  @Post(":id/download")
  async downloadTrack(
    @Req() req: RequestWithUser,
    @Param("id") trackId: string,
    @Body() body: { versionId?: string },
  ) {
    return this.tracksService.createDownloadUrl(
      req.user.id,
      trackId,
      body.versionId,
    );
  }

  @Patch(":id")
  async updateTrack(
    @Req() req: RequestWithUser,
    @Param("id") trackId: string,
    @Body() dto: UpdateTrackDto,
  ) {
    return this.tracksService.updateTrack(req.user.id, trackId, dto);
  }

  @Delete(":id")
  async deleteTrack(@Req() req: RequestWithUser, @Param("id") trackId: string) {
    return this.tracksService.deleteTrack(req.user.id, trackId);
  }

  @Post(":id/replace-url")
  async replaceTrackAudio(
    @Req() req: RequestWithUser,
    @Param("id") trackId: string,
    @Body() dto: ReplaceTrackAudioUrlDto,
  ) {
    return this.tracksService.createReplaceAudioUrl(req.user.id, trackId, dto);
  }

  @Post(":id/replace-complete")
  async completeReplaceTrackAudio(
    @Req() req: RequestWithUser,
    @Param("id") trackId: string,
    @Body() body: { uploadIntentId: string },
  ) {
    return this.tracksService.completeUpload(
      req.user.id,
      trackId,
      body.uploadIntentId,
    );
  }

  @Post(":id/artwork/upload-url")
  async getArtworkUploadUrl(
    @Req() req: RequestWithUser,
    @Param("id") trackId: string,
    @Body() dto: CreateArtworkUploadUrlDto,
  ) {
    return this.tracksService.createArtworkUploadUrl(req.user.id, trackId, dto);
  }

  @Post(":id/artwork/complete")
  async completeArtworkUpload(
    @Req() req: RequestWithUser,
    @Param("id") trackId: string,
    @Body() body: { artworkUploadIntentId: string },
  ) {
    return this.tracksService.completeArtworkUpload(
      req.user.id,
      trackId,
      body.artworkUploadIntentId,
    );
  }
}
