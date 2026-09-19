import { Injectable } from "@nestjs/common";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import { AdminAuditLogRecord, AdminAuditLogFilterDto } from "@platform/types";

@Injectable()
export class AdminAuditLogsService {
  constructor(private readonly prisma: PrismaClient) {}

  async logAction(params: {
    actingAdminUserId: string;
    actionType: string;
    targetEntityType: string;
    targetEntityId: string;
    beforeState?: any;
    afterState?: any;
    reason: string;
    requestId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const id = generateUuidV7();
    return this.prisma.adminAuditLog.create({
      data: {
        id,
        actingAdminUserId: params.actingAdminUserId,
        actionType: params.actionType,
        targetEntityType: params.targetEntityType,
        targetEntityId: params.targetEntityId,
        beforeState: params.beforeState ? JSON.stringify(params.beforeState) : null,
        afterState: params.afterState ? JSON.stringify(params.afterState) : null,
        reason: params.reason,
        requestId: params.requestId || null,
        sessionId: params.sessionId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  }

  async getAuditLogs(filter: AdminAuditLogFilterDto = {}): Promise<{
    items: AdminAuditLogRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.actingAdminUserId) {
      where.actingAdminUserId = filter.actingAdminUserId;
    }
    if (filter.actionType) {
      where.actionType = filter.actionType;
    }
    if (filter.targetEntityType) {
      where.targetEntityType = filter.targetEntityType;
    }
    if (filter.targetEntityId) {
      where.targetEntityId = filter.targetEntityId;
    }
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
    }
    if (filter.search) {
      where.OR = [
        { reason: { contains: filter.search, mode: "insensitive" } },
        { actionType: { contains: filter.search, mode: "insensitive" } },
        { targetEntityType: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.adminAuditLog.findMany({
        where,
        include: {
          actingAdmin: {
            select: {
              id: true,
              username: true,
              displayName: true,
              roleAssignments: { select: { role: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const items: AdminAuditLogRecord[] = records.map((r) => {
      let parsedBefore = null;
      let parsedAfter = null;
      try {
        if (r.beforeState) parsedBefore = JSON.parse(r.beforeState);
      } catch (e) {}
      try {
        if (r.afterState) parsedAfter = JSON.parse(r.afterState);
      } catch (e) {}

      const role = r.actingAdmin.roleAssignments[0]?.role || "ADMIN";

      return {
        id: r.id,
        actingAdminUserId: r.actingAdminUserId,
        actingAdminUsername: r.actingAdmin.username || "System Admin",
        actingAdminRole: role,
        actionType: r.actionType,
        targetEntityType: r.targetEntityType,
        targetEntityId: r.targetEntityId,
        beforeState: parsedBefore,
        afterState: parsedAfter,
        reason: r.reason,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return { items, total, page, limit };
  }
}
