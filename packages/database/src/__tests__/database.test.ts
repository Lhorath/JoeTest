import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateUuidV7, testDbConnection, prisma } from "../index";

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => {
      return {
        $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
      };
    }),
  };
});

describe("Database Foundation Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateUuidV7", () => {
    it("should generate a valid 36-character UUIDv7 string", () => {
      const uuid = generateUuidV7();
      expect(uuid).toHaveLength(36);
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("should generate lexicographically sortable time-ordered values", async () => {
      const first = generateUuidV7();
      // Introduce a tiny delay to ensure distinct timestamps
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = generateUuidV7();

      expect(second > first).toBe(true);
    });
  });

  describe("testDbConnection", () => {
    it("should return true when database query executes successfully", async () => {
      const mockQueryRaw = vi
        .spyOn(prisma, "$queryRaw")
        .mockResolvedValue([{ "?column?": 1 }]);

      const isConnected = await testDbConnection();

      expect(isConnected).toBe(true);
      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it("should return false and log error when query fails", async () => {
      const mockQueryRaw = vi
        .spyOn(prisma, "$queryRaw")
        .mockRejectedValue(new Error("Connection failure"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const isConnected = await testDbConnection();

      expect(isConnected).toBe(false);
      expect(mockQueryRaw).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
