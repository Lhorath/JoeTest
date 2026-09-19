import { Injectable } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";

@Injectable()
export class SecurityEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async logEvent(
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
    data: {
      userId: string;
      eventType: string;
      ipAddress: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return tx.userSecurityEvent.create({
      data: {
        id: generateUuidV7(),
        userId: data.userId,
        eventType: data.eventType,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  }
}
