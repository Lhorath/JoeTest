import { Injectable } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";

@Injectable()
export class TokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEmailVerificationToken(
    tx: any,
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    const client = tx || this.prisma;
    return client.emailVerificationTokenRecord.create({
      data: {
        id: generateUuidV7(),
        email,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findEmailVerificationToken(tokenHash: string) {
    return this.prisma.emailVerificationTokenRecord.findUnique({
      where: { tokenHash },
    });
  }

  async createPasswordResetToken(
    tx: any,
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    const client = tx || this.prisma;
    return client.passwordResetTokenRecord.create({
      data: {
        id: generateUuidV7(),
        email,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findPasswordResetToken(tokenHash: string) {
    return this.prisma.passwordResetTokenRecord.findUnique({
      where: { tokenHash },
    });
  }

  async markEmailVerificationTokenUsed(tx: any, id: string) {
    const client = tx || this.prisma;
    return client.emailVerificationTokenRecord.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async markPasswordResetTokenUsed(tx: any, id: string) {
    const client = tx || this.prisma;
    return client.passwordResetTokenRecord.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
