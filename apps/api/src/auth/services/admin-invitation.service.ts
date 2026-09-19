import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import {
  PrismaClient,
  generateUuidV7,
  assertOwnerAdminRetention,
} from "@platform/database";
import {
  Role,
  AdminPermission,
  InvitationStatus,
  AccountStatus,
} from "@platform/types";
import { generateSecureToken, hashToken, hashPassword } from "@platform/auth";
import { AdminInvitationAcceptInput } from "@platform/validation";
import { MailDeliveryService } from "../../mail/mail.interface";
import { UserRepository } from "../repositories/user.repository";

@Injectable()
export class AdminInvitationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly userRepository: UserRepository,
    @Inject("MailDeliveryService")
    private readonly mailService: MailDeliveryService,
  ) {}

  async createInvitation(
    creatorUserId: string,
    targetEmail: string,
    intendedRole: Role.OWNER_ADMIN | Role.MODERATOR,
  ) {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    // Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.adminInvitation.create({
      data: {
        id: generateUuidV7(),
        email: targetEmail.toLowerCase().trim(),
        intendedRole,
        tokenHash,
        expiresAt,
        createdByUserId: creatorUserId,
      },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        id: generateUuidV7(),
        actingAdminUserId: creatorUserId,
        actionType: "ADMIN_INVITATION_CREATED",
        targetEntityType: "AdminInvitation",
        targetEntityId: invitation.id,
        reason: `Invited as ${intendedRole}`,
      },
    });

    this.mailService
      .sendAdminInvitation(targetEmail, rawToken, intendedRole)
      .catch(() => {});
    return { success: true };
  }

  async acceptInvitation(
    input: AdminInvitationAcceptInput,
    ipAddress: string,
    existingUserId?: string,
  ) {
    const tokenHash = hashToken(input.token);

    // We run the whole acceptance in a transaction
    await this.prisma.$transaction(async (tx: any) => {
      const invitation = await tx.adminInvitation.findUnique({
        where: { tokenHash },
        include: { creator: true },
      });

      if (!invitation) {
        throw new BadRequestException("Invalid invitation token");
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException(`Invitation is ${invitation.status}`);
      }

      if (invitation.expiresAt < new Date()) {
        await tx.adminInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
        throw new BadRequestException("Invitation has expired");
      }

      let targetUserId = existingUserId;

      // New user flow
      if (!targetUserId) {
        if (
          !input.email ||
          !input.username ||
          !input.password ||
          !input.displayName
        ) {
          throw new BadRequestException(
            "Full registration details are required for new users accepting invitations",
          );
        }

        const normalizedEmail = input.email.toLowerCase().trim();
        if (normalizedEmail !== invitation.email) {
          throw new BadRequestException("Email must match the invited address");
        }

        const existingAccount = await tx.user.findUnique({
          where: { normalizedEmail },
        });
        if (existingAccount) {
          throw new BadRequestException(
            "Account with this email already exists. Please login and accept the invitation.",
          );
        }

        const passwordHash = await hashPassword(input.password);

        const newUser = await tx.user.create({
          data: {
            id: generateUuidV7(),
            email: input.email,
            normalizedEmail,
            username: input.username,
            normalizedUsername: input.username.toLowerCase().trim(),
            displayName: input.displayName,
            passwordHash,
            accountStatus: AccountStatus.ACTIVE, // Skip pending_verification for admin invites
            emailVerified: true,
            roleAssignments: {
              create: {
                id: generateUuidV7(),
                role: Role.USER,
              },
            },
          },
        });

        targetUserId = newUser.id;
      }

      if (!targetUserId) {
        throw new Error("Target User ID resolution failed.");
      }

      // Check if they already have the role
      const existingRole = await tx.userRoleAssignment.findFirst({
        where: {
          userId: targetUserId,
          role: invitation.intendedRole,
          isActive: true,
        },
      });

      if (!existingRole) {
        await tx.userRoleAssignment.create({
          data: {
            id: generateUuidV7(),
            userId: targetUserId,
            role: invitation.intendedRole,
          },
        });

        await tx.adminRoleChange.create({
          data: {
            id: generateUuidV7(),
            actingAdminUserId: invitation.createdByUserId, // The original inviter acts as the sponsor
            targetUserId: targetUserId,
            previousRole: Role.USER, // Simplified tracking
            newRole: invitation.intendedRole,
            reason: "Accepted administrative invitation",
          },
        });
      }

      // Mark invitation as accepted
      await tx.adminInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          invitedUserId: targetUserId,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          id: generateUuidV7(),
          actingAdminUserId: invitation.createdByUserId,
          actionType: "ADMIN_INVITATION_ACCEPTED",
          targetEntityType: "User",
          targetEntityId: targetUserId,
          reason: "User accepted the invitation",
          ipAddress,
        },
      });
    });
  }

  // Admin safeguard failsafe utility wrapper
  async removeOwnerAdminRole(targetUserId: string, actingAdminUserId: string) {
    await this.prisma.$transaction(async (tx: any) => {
      // 1. Lock active Owner Administrator assignments by pulling all active owners
      const activeOwners = await tx.userRoleAssignment.findMany({
        where: { role: Role.OWNER_ADMIN, isActive: true },
        include: { user: true },
      });

      // 2. Count active and usable Owner Administrators
      const usableOwners = activeOwners.filter(
        (a: any) => a.user.accountStatus === AccountStatus.ACTIVE,
      );

      // 3. Failsafe: reject mutation if this would leave zero
      const isTargetUsableOwner = usableOwners.some(
        (a: any) => a.userId === targetUserId,
      );
      if (isTargetUsableOwner) {
        assertOwnerAdminRetention(usableOwners.length); // Throws if length <= 1
      }

      // 4. Apply the role change
      await tx.userRoleAssignment.updateMany({
        where: { userId: targetUserId, role: Role.OWNER_ADMIN, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });

      // 5. Write history
      await tx.adminRoleChange.create({
        data: {
          id: generateUuidV7(),
          actingAdminUserId,
          targetUserId,
          previousRole: Role.OWNER_ADMIN,
          newRole: "REVOKED",
          reason: "Owner Administrator role revoked",
        },
      });

      // 6. Write Audit log
      await tx.adminAuditLog.create({
        data: {
          id: generateUuidV7(),
          actingAdminUserId,
          actionType: "ADMIN_ROLE_REVOKED",
          targetEntityType: "User",
          targetEntityId: targetUserId,
          reason: "Owner Administrator role revoked",
        },
      });
    });
  }
}
