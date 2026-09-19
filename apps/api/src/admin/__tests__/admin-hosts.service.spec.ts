import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminHostsService } from "../admin-hosts.service";
import { HostApplicationStatus } from "@platform/types";

describe("AdminHostsService", () => {
  let service: AdminHostsService;

  const mockPrisma = {
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    hostApplication: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    hostApplicationReview: {
      create: vi.fn(),
    },
    hostProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };

  const mockAuditLogsService = {
    logAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminHostsService(
      mockPrisma as any,
      mockAuditLogsService as any,
    );
  });

  describe("approveHost", () => {
    it("should approve host application, update user to host, and log audit event", async () => {
      mockPrisma.hostApplication.findUnique.mockResolvedValue({
        id: "app_1",
        applicantUserId: "u_1",
      });

      const res = await service.approveHost("app_1", "admin_1");

      expect(res.success).toBe(true);
      expect(mockPrisma.hostApplication.update).toHaveBeenCalledWith({
        where: { id: "app_1" },
        data: { status: HostApplicationStatus.APPROVED },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u_1" },
        data: { isHost: true },
      });
      expect(mockAuditLogsService.logAction).toHaveBeenCalled();
    });
  });

  describe("suspendHost", () => {
    it("should set suspendedAt date on host profile", async () => {
      mockPrisma.hostProfile.findUnique.mockResolvedValue({ id: "hp_1" });

      const res = await service.suspendHost("hp_1", "admin_1", "Terms violation");

      expect(res.success).toBe(true);
      expect(mockPrisma.hostProfile.update).toHaveBeenCalledWith({
        where: { id: "hp_1" },
        data: { suspendedAt: expect.any(Date) },
      });
      expect(mockAuditLogsService.logAction).toHaveBeenCalled();
    });
  });
});
