import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { RequiredRoles, RequiredPermissions } from "../auth/decorators/auth.decorators";
import { Role, AdminPermission, AdminMediaFilterDto } from "@platform/types";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";
import { AdminTracksService } from "./admin-tracks.service";

@Controller("admin/media")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
export class AdminMediaController {
  constructor(private readonly tracksService: AdminTracksService) {}

  @Get()
  @RequiredPermissions(AdminPermission.CONTENT_MODERATE)
  async getMedia(@Query() query: AdminMediaFilterDto) {
    return this.tracksService.getMediaSummaries(query);
  }

  @Delete(":id")
  @RequiredPermissions(AdminPermission.CONTENT_MODERATE)
  async deleteMedia(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body?: { purgeS3?: boolean; reason?: string },
  ) {
    return this.tracksService.deleteMediaWithSafeguards(
      id,
      req.user.id,
      body,
    );
  }

  @Get("cleanup")
  @RequiredPermissions(AdminPermission.ADMIN_PLATFORM_FULL)
  async getStorageCleanupReport() {
    return this.tracksService.getStorageCleanupReport();
  }

  @Post("cleanup")
  @RequiredPermissions(AdminPermission.ADMIN_PLATFORM_FULL)
  async purgeStorageCandidates(
    @Req() req: RequestWithUser,
    @Body() body?: { confirmed?: boolean },
  ) {
    return this.tracksService.purgeStorageCandidates(
      req.user.id,
      Boolean(body?.confirmed),
    );
  }
}
