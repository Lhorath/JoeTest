import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { RequiredRoles, RequiredPermissions } from "../auth/decorators/auth.decorators";
import { Role, AdminPermission } from "@platform/types";
import { AdminLiveSessionsService } from "./admin-live-sessions.service";

@Controller("admin/live-sessions")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
export class AdminLiveSessionsController {
  constructor(private readonly liveSessionsService: AdminLiveSessionsService) {}

  @Get()
  @RequiredPermissions(AdminPermission.CONTENT_MODERATE)
  async getLiveSessions(
    @Query("status") status?: string,
    @Query("hostId") hostId?: string,
  ) {
    return this.liveSessionsService.getLiveSessions({ status, hostId });
  }

  @Get(":id")
  @RequiredPermissions(AdminPermission.CONTENT_MODERATE)
  async getLiveSession(@Param("id") id: string) {
    return this.liveSessionsService.getLiveSessionDetail(id);
  }
}
