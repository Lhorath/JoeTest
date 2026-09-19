import { Controller, Get, UseGuards } from "@nestjs/common";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { RequiredRoles, RequiredPermissions } from "../auth/decorators/auth.decorators";
import { Role, AdminPermission, AdminDashboardMetrics } from "@platform/types";
import { AdminDashboardService } from "./admin-dashboard.service";

@Controller("admin/dashboard")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
@RequiredPermissions(AdminPermission.ADMIN_PLATFORM_FULL)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get()
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    return this.dashboardService.getDashboardMetrics();
  }
}
