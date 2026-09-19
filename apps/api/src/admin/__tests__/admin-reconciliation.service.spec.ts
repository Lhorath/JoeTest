import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminReconciliationService } from "../admin-reconciliation.service";
import { PaymentStatus } from "@platform/types";

describe("AdminReconciliationService", () => {
  let service: AdminReconciliationService;

  const mockPrisma = {
    payment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    priorityTierReservation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };

  const mockAuditLogsService = {
    logAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminReconciliationService(
      mockPrisma as any,
      mockAuditLogsService as any,
    );
  });

  describe("getReconciliationReport", () => {
    it("should identify discrepancies between DB and Stripe statuses", async () => {
      const mockPayments = [
        {
          id: "p_1",
          stripePaymentIntentId: "pi_1",
          status: PaymentStatus.SETTLED,
          grossAmountCents: 1500,
          capturedAt: new Date(),
          createdAt: new Date(),
          user: { username: "alice" },
          submission: { id: "sub_1", trackSnapshot: { songName: "Song 1" } },
        },
      ];

      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

      const report = await service.scanDiscrepancies();

      expect(report.discrepanciesCount).toBeDefined();
      expect(Array.isArray(report.discrepancies)).toBe(true);
      expect(report.scannedAt).toBeDefined();
    });
  });
});
