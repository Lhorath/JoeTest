import { Injectable } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createSession(
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
    data: {
      userId: string;
      tokenHash: string;
      ipAddress?: string;
      userAgent?: string;
      idleExpiresAt: Date;
      absoluteExpiresAt: Date;
    },
  ) {
    return tx.userSession.create({
      data: {
        id: generateUuidV7(),
        userId: data.userId,
        tokenHash: data.tokenHash,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        idleExpiresAt: data.idleExpiresAt,
        absoluteExpiresAt: data.absoluteExpiresAt,
      },
    });
  }

  async findByTokenHash(tokenHash: string) {
    return this.prisma.userSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roleAssignments: true,
            permissionAssignments: true,
          },
        },
      },
    });
  }

  async updateLastSeen(sessionId: string) {
    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
  }

  async revokeSession(
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
    sessionId: string,
    reason: string,
  ) {
    return tx.userSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });
  }

  async revokeAllUserSessions(
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
    userId: string,
    reason: string,
    exceptSessionId?: string,
  ) {
    return tx.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: {
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });
  }

  async findActiveUserSessions(userId: string) {
    const now = new Date();
    return this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        idleExpiresAt: { gt: now },
        absoluteExpiresAt: { gt: now },
      },
      orderBy: { lastSeenAt: "desc" },
    });
  }
}
