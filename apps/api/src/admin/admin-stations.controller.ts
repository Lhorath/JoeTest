import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { RequiredRoles, RequiredPermissions } from "../auth/decorators/auth.decorators";
import { Role, AdminPermission } from "@platform/types";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";
import { AdminStationsService } from "./admin-stations.service";

@Controller("admin/stations")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
export class AdminStationsController {
  constructor(private readonly stationsService: AdminStationsService) {}

  @Get()
  @RequiredPermissions(AdminPermission.CONTENT_MODERATE)
  async getStations(@Query("search") search?: string) {
    return this.stationsService.getStations({ search });
  }

  @Patch(":id")
  @RequiredPermissions(AdminPermission.CONTENT_MODERATE)
  async updateStation(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: { submissionsEnabled?: boolean; name?: string },
  ) {
    return this.stationsService.updateStation(id, req.user.id, body);
  }
}
