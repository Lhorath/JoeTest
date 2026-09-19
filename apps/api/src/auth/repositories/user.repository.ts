import { Injectable } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import {
  AccountStatus,
  Role,
  AdminPermission,
  PermissionOverrideType,
} from "@platform/types";

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    return this.prisma.user.findUnique({
      where: { normalizedEmail },
      include: {
        roleAssignments: true,
        permissionAssignments: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: true,
        permissionAssignments: true,
      },
    });
  }

  async create(
    tx: any,
    data: {
      email: string;
      username: string;
      displayName: string;
      passwordHash: string;
    },
  ) {
    const client = tx || this.prisma;
    return client.user.create({
      data: {
        id: generateUuidV7(),
        email: data.email,
        normalizedEmail: data.email.toLowerCase().trim(),
        username: data.username,
        normalizedUsername: data.username.toLowerCase().trim(),
        displayName: data.displayName,
        passwordHash: data.passwordHash,
        accountStatus: AccountStatus.PENDING_EMAIL_VERIFICATION,
        roleAssignments: {
          create: {
            id: generateUuidV7(),
            role: Role.USER,
          },
        },
      },
    });
  }

  async updateAccountStatus(
    tx: any,
    userId: string,
    status: AccountStatus,
    emailVerified?: boolean,
  ) {
    const client = tx || this.prisma;
    return client.user.update({
      where: { id: userId },
      data: {
        accountStatus: status,
        ...(emailVerified !== undefined ? { emailVerified } : {}),
      },
    });
  }

  async updatePassword(tx: any, userId: string, passwordHash: string) {
    const client = tx || this.prisma;
    return client.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
