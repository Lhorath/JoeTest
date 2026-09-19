import {
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { RequiredRoles, RequiredPermissions } from "../auth/decorators/auth.decorators";
import { Role, AdminPermission, AdminAuditLogFilterDto } from "@platform/types";
import { AdminAuditLogsService } from "./admin-audit-logs.service";

@Controller("admin/audit-logs")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AdminAuditLogsService) {}

  @Get()
  @RequiredPermissions(AdminPermission.AUDIT_LOG_VIEW)
  async getAuditLogs(@Query() query: AdminAuditLogFilterDto) {
    return this.auditLogsService.getAuditLogs(query);
  }
}
