import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminPaymentsService } from "../admin-payments.service";
import { PaymentStatus } from "@platform/types";

describe("AdminPaymentsService", () => {
  let service: AdminPaymentsService;

  const mockPrisma = {
    payment: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    refund: {
      create: vi.fn(),
    },
    ledgerTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };

  const mockAuditLogsService = {
    logAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminPaymentsService(mockPrisma as any);
  });

  describe("getPayments", () => {
    it("should fetch and map payments with ledger allocations", async () => {
      const mockPayment = {
        id: "pay_1",
        stripePaymentIntentId: "pi_1",
        status: PaymentStatus.SETTLED,
        grossAmountCents: 2000,
        currency: "USD",
        platformAllocationCents: 400,
        hostAllocationCents: 1600,
        capturedAt: new Date(),
        createdAt: new Date(),
        user: { id: "u_1", username: "charlie" },
        submission: {
          trackSnapshot: { songName: "My Track", artistName: "Artist C" },
          liveSession: {
            station: {
              stationName: "Station C",
              host: { user: { username: "host_c" } },
            },
          },
        },
        allocations: [
          {
            stripeFeeAmountCents: 88,
            platformNetAmountCents: 312,
            hostAmountCents: 1600,
            platformGrossAmountCents: 400,
          },
        ],
        refunds: [],
      };

      mockPrisma.payment.count.mockResolvedValue(1);
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);

      const res = await service.getPayments({ page: 1, limit: 10 });

      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
      expect(res.items[0].grossAmountCents).toBe(2000);
      expect(res.items[0].hostUsername).toBe("host_c");
    });
  });
});
