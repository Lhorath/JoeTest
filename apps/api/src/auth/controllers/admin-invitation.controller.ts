import { Controller, Post, Body, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AdminInvitationService } from "../services/admin-invitation.service";
import { AuthProtectionService } from "../protection/auth-protection.service";
import { AdminInvitationAcceptInput } from "@platform/validation";
import { PublicRoute, RequiredRoles } from "../decorators/auth.decorators";
import { CurrentUser } from "../decorators/current-user.decorator";
import { AuthenticatedUser } from "@platform/auth";
import { Role } from "@platform/types";
import { AuthorizationGuard } from "../guards/authorization.guard";
import { SessionGuard } from "../guards/session.guard";
import { z } from "zod";

// A quick DTO for creating invitations (just for completeness based on reqs)
const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([Role.OWNER_ADMIN, Role.MODERATOR]),
});

@Controller("admin/invitations")
export class AdminInvitationController {
  constructor(
    private readonly invitationService: AdminInvitationService,
    private readonly authProtectionService: AuthProtectionService,
  ) {}

  @PublicRoute()
  @Post("accept")
  async acceptInvitation(
    @Body() input: AdminInvitationAcceptInput,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

    // Rate limit invitation acceptance by IP
    await this.authProtectionService.verifyActionAllowed(
      `invite_accept_${ipAddress}`,
      ipAddress,
    );

    // If there's a session token cookie, they are an existing user.
    // In a real app we'd parse the cookie here or use an OptionalAuthGuard.
    // To keep it simple, we assume if they pass no registration fields, they are authenticated.
    // Our service handles the branching logic.
    let existingUserId = undefined;
    const user = (req as any).user as AuthenticatedUser;
    if (user) {
      existingUserId = user.id;
    }

    try {
      await this.invitationService.acceptInvitation(
        input,
        ipAddress,
        existingUserId,
      );
      await this.authProtectionService.recordAttempt(
        `invite_accept_${ipAddress}`,
        ipAddress,
        undefined,
        true,
      );
      return { success: true, message: "Invitation accepted successfully" };
    } catch (err) {
      await this.authProtectionService.recordAttempt(
        `invite_accept_${ipAddress}`,
        ipAddress,
        undefined,
        false,
        "Invitation failed",
      );
      throw err;
    }
  }

  @UseGuards(SessionGuard, AuthorizationGuard)
  @RequiredRoles(Role.OWNER_ADMIN)
  @Post("create")
  async createInvitation(
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const input = createInviteSchema.parse(body);
    await this.invitationService.createInvitation(
      user.id,
      input.email,
      input.role as any,
    );
    return { success: true };
  }
}
