import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AdminUsersService } from "./admin-users.service";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import {
  RequiredRoles,
  RequiredPermissions,
} from "../auth/decorators/auth.decorators";
import { Role, AdminPermission, AdminUserFilterDto, AdminUserActionDto } from "@platform/types";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";

@Controller("admin/users")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @RequiredPermissions(AdminPermission.USER_BAN_MANAGE)
  async getUsers(@Query() query: AdminUserFilterDto) {
    return this.adminUsersService.getUsers(query);
  }

  @Get(":id")
  @RequiredPermissions(AdminPermission.USER_BAN_MANAGE)
  async getUser(@Param("id") id: string) {
    return this.adminUsersService.getUser(id);
  }

  @Post(":id/action")
  @RequiredPermissions(AdminPermission.USER_BAN_MANAGE)
  async moderateUser(
    @Req() req: RequestWithUser,
    @Param("id") targetUserId: string,
    @Body() body: AdminUserActionDto,
  ) {
    const roles = req.user.roles || [];
    if (body.action === "SUSPEND") {
      return this.adminUsersService.suspendUser(
        targetUserId,
        req.user.id,
        roles,
        body.reason,
      );
    }
    if (body.action === "UNSUSPEND") {
      return this.adminUsersService.unsuspendUser(
        targetUserId,
        req.user.id,
        roles,
        body.reason,
      );
    }
    if (body.action === "REVOKE_SESSIONS") {
      return this.adminUsersService.revokeUserSessions(
        targetUserId,
        req.user.id,
        roles,
        body.reason,
      );
    }
    return { success: false, message: "Unsupported action" };
  }

  @Post(":id/ban")
  @RequiredPermissions(AdminPermission.USER_BAN_MANAGE)
  async banUser(
    @Req() req: RequestWithUser,
    @Param("id") targetUserId: string,
    @Body()
    body: {
      reasonCode: string;
      internalReason: string;
      userVisibleReason: string;
    },
  ) {
    return this.adminUsersService.banUser(
      targetUserId,
      req.user.id,
      body.reasonCode,
      body.internalReason,
      body.userVisibleReason,
    );
  }

  @Post(":id/delete")
  @RequiredPermissions(AdminPermission.ADMIN_PLATFORM_FULL)
  async deleteUser(@Param("id") targetUserId: string) {
    return this.adminUsersService.deleteUser(targetUserId);
  }
}
