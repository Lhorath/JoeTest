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
import { Role, AdminPermission, AdminPaymentFilterDto } from "@platform/types";
import { AdminPaymentsService } from "./admin-payments.service";

@Controller("admin/payments")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: AdminPaymentsService) {}

  @Get()
  @RequiredPermissions(AdminPermission.PAYMENT_RECORD_VIEW)
  async getPayments(@Query() query: AdminPaymentFilterDto) {
    return this.paymentsService.getPayments(query);
  }

  @Get(":id")
  @RequiredPermissions(AdminPermission.PAYMENT_RECORD_VIEW)
  async getPayment(@Param("id") id: string) {
    return this.paymentsService.getPayment(id);
  }
}
