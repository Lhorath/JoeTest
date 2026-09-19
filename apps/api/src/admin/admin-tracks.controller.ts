import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  Body,
  Post,
} from "@nestjs/common";
import { AdminTracksService } from "./admin-tracks.service";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import {
  RequiredRoles,
  RequiredPermissions,
} from "../auth/decorators/auth.decorators";
import { Role, AdminPermission, StorageStatus } from "@platform/types";

class GetAdminTracksQueryDto {
  neverPlayed?: boolean;
  inactiveDays?: number;
  storageStatus?: StorageStatus;
  ownerUserId?: string;
  sortBy?:
    | "lastPlayedDesc"
    | "lastPlayedAsc"
    | "uploadDate"
    | "fileSize"
    | "title"
    | "artist";
}

@Controller("admin/tracks")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
@RequiredPermissions(AdminPermission.CONTENT_MODERATE)
export class AdminTracksController {
  constructor(private readonly adminTracksService: AdminTracksService) {}

  @Get()
  async getTracks(@Query() query: GetAdminTracksQueryDto) {
    // Basic conversion for query params that come as strings
    if (query.neverPlayed)
      query.neverPlayed = query.neverPlayed.toString() === "true";
    if (query.inactiveDays)
      query.inactiveDays = parseInt(query.inactiveDays as any, 10);

    return this.adminTracksService.getAdminTracks(query);
  }

  @Delete(":id")
  async deleteTrackMedia(@Param("id") trackId: string) {
    return this.adminTracksService.deleteTrackMedia(trackId);
  }

  @Delete("artwork/:id")
  async deleteArtwork(@Param("id") artworkId: string) {
    return this.adminTracksService.deleteArtwork(artworkId);
  }

  @Post("objects/delete")
  async deleteMediaObject(@Body() body: { objectKey: string }) {
    return this.adminTracksService.deleteMediaObject(body.objectKey);
  }

  @Delete("user/:id")
  async deleteUserMedia(@Param("id") userId: string) {
    return this.adminTracksService.deleteUserMedia(userId);
  }
}
