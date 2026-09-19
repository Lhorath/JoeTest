import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { RequiredRoles, RequiredPermissions } from "../auth/decorators/auth.decorators";
import { Role, AdminPermission, AdminHostFilterDto } from "@platform/types";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";
import { AdminHostsService } from "./admin-hosts.service";

@Controller("admin")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
export class AdminHostsController {
  constructor(private readonly hostsService: AdminHostsService) {}

  @Get("hosts")
  @RequiredPermissions(AdminPermission.USER_BAN_MANAGE)
  async getHosts(@Query() query: AdminHostFilterDto) {
    return this.hostsService.getHosts(query);
  }

  @Post("host-applications/:id/approve")
  @RequiredPermissions(AdminPermission.USER_BAN_MANAGE)
  async approveHost(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.hostsService.approveHost(id, req.user.id);
  }

  @Post("host-applications/:id/reject")
  @RequiredPermissions(AdminPermission.USER_BAN_MANAGE)
  async rejectHost(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.hostsService.rejectHost(
      id,
      req.user.id,
      body.reason || "Application declined by administrator",
    );
  }

  @Post("host-applications/:id/suspend")
  @RequiredPermissions(AdminPermission.USER_BAN_MANAGE)
  async suspendHost(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.hostsService.suspendHost(
      id,
      req.user.id,
      body.reason || "Host suspended by administrator",
    );
  }

  @Post("hosts/:id/reinstate")
  @RequiredPermissions(AdminPermission.USER_BAN_MANAGE)
  async reinstateHost(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.hostsService.reinstateHost(
      id,
      req.user.id,
      body.reason || "Host reinstated by administrator",
    );
  }
}
