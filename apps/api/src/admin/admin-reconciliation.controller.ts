import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { RequiredRoles, RequiredPermissions } from "../auth/decorators/auth.decorators";
import { Role, AdminPermission, AdminRepairDto } from "@platform/types";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";
import { AdminReconciliationService } from "./admin-reconciliation.service";

@Controller("admin/reconciliation")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN)
export class AdminReconciliationController {
  constructor(private readonly reconciliationService: AdminReconciliationService) {}

  @Get()
  @RequiredPermissions(AdminPermission.ADMIN_PLATFORM_FULL)
  async getReconciliationReport() {
    return this.reconciliationService.scanDiscrepancies();
  }

  @Post("repair")
  @RequiredPermissions(AdminPermission.ADMIN_PLATFORM_FULL)
  async repairDiscrepancy(
    @Req() req: RequestWithUser,
    @Body() body: AdminRepairDto,
  ) {
    return this.reconciliationService.repairDiscrepancy(
      req.user.id,
      body,
    );
  }
}
