import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { RequiredRoles, RequiredPermissions } from "../auth/decorators/auth.decorators";
import { Role, AdminPermission, AdminCompensatingEntryDto } from "@platform/types";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";
import { AdminLedgerService } from "./admin-ledger.service";

@Controller("admin/ledger")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN)
export class AdminLedgerController {
  constructor(private readonly ledgerService: AdminLedgerService) {}

  @Get()
  @RequiredPermissions(AdminPermission.ADMIN_PLATFORM_FULL)
  async getLedger(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.ledgerService.getLedgerReport({ page, limit });
  }

  @Post("compensating")
  @RequiredPermissions(AdminPermission.ADMIN_PLATFORM_FULL)
  async createCompensatingEntry(
    @Req() req: RequestWithUser,
    @Body() body: AdminCompensatingEntryDto,
  ) {
    return this.ledgerService.createCompensatingEntry(
      req.user.id,
      body,
    );
  }
}
