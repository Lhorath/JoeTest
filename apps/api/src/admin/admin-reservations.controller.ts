import {
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { RequiredRoles, RequiredPermissions } from "../auth/decorators/auth.decorators";
import { Role, AdminPermission } from "@platform/types";
import { AdminReservationsService } from "./admin-reservations.service";

@Controller("admin/reservations")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
export class AdminReservationsController {
  constructor(private readonly reservationsService: AdminReservationsService) {}

  @Post("cleanup")
  @RequiredPermissions(AdminPermission.CONTENT_MODERATE)
  async cleanupReservations() {
    return this.reservationsService.cleanupExpiredReservations();
  }
}
