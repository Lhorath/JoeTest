import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ensureLegalDocumentAndVersion,
  persistLegalAcceptanceToDb,
  getDbLegalAcceptancesForUser,
  hasUserAcceptedCurrentVersionInDb,
  prisma,
} from "../index";

// Mock Prisma client methods
vi.mock("@prisma/client", () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => {
      return {
        $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
        legalDocument: {
          findUnique: vi.fn(),
          upsert: vi.fn(),
        },
        legalDocumentVersion: {
          findUnique: vi.fn(),
          upsert: vi.fn(),
        },
        legalAcceptance: {
          findUnique: vi.fn(),
          create: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
        },
      };
    }),
  };
});

describe("Legal Document & Acceptance Persistence (PostgreSQL / Prisma)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ensureLegalDocumentAndVersion", () => {
    it("should retrieve existing document and version without duplicating", async () => {
      const mockDoc = {
        id: "01918a20-0000-7000-8000-000000000001",
        slug: "terms",
        title: "Terms of Service",
      };
      const mockVersion = {
        id: "01918a20-0000-7000-8000-000000000002",
        documentId: mockDoc.id,
        versionString: "2026-08-25.1",
      };

      vi.spyOn(prisma.legalDocument, "findUnique").mockResolvedValue(mockDoc as any);
      vi.spyOn(prisma.legalDocumentVersion, "findUnique").mockResolvedValue(mockVersion as any);

      const result = await ensureLegalDocumentAndVersion({
        slug: "terms",
        title: "Terms of Service",
        versionString: "2026-08-25.1",
      });

      expect(result.documentId).toBe(mockDoc.id);
      expect(result.versionId).toBe(mockVersion.id);
      expect(prisma.legalDocument.upsert).not.toHaveBeenCalled();
      expect(prisma.legalDocumentVersion.upsert).not.toHaveBeenCalled();
    });

    it("should upsert deterministic document and version when not found", async () => {
      const mockDoc = {
        id: "01918a20-0000-7000-8000-000000000003",
        slug: "privacy",
        title: "Privacy Policy",
      };
      const mockVersion = {
        id: "01918a20-0000-7000-8000-000000000004",
        documentId: mockDoc.id,
        versionString: "2026-08-25.1",
      };

      vi.spyOn(prisma.legalDocument, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.legalDocument, "upsert").mockResolvedValue(mockDoc as any);
      vi.spyOn(prisma.legalDocumentVersion, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.legalDocumentVersion, "upsert").mockResolvedValue(mockVersion as any);

      const result = await ensureLegalDocumentAndVersion({
        slug: "privacy",
        title: "Privacy Policy",
        versionString: "2026-08-25.1",
      });

      expect(result.documentId).toBe(mockDoc.id);
      expect(result.versionId).toBe(mockVersion.id);
      expect(prisma.legalDocument.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: "privacy" } }),
      );
    });
  });

  describe("persistLegalAcceptanceToDb (Idempotency & Audit Trails)", () => {
    const testUserId = "01918a20-0000-7000-8000-000000000010";
    const testDocId = "01918a20-0000-7000-8000-000000000001";
    const testVersionId = "01918a20-0000-7000-8000-000000000002";

    it("should persist a new legal acceptance record with audit metadata", async () => {
      vi.spyOn(prisma.legalDocument, "findUnique").mockResolvedValue({
        id: testDocId,
        slug: "terms",
        title: "Terms of Service",
      } as any);
      vi.spyOn(prisma.legalDocumentVersion, "findUnique").mockResolvedValue({
        id: testVersionId,
        documentId: testDocId,
        versionString: "2026-08-25.1",
      } as any);

      // No existing record for [userId, versionId]
      vi.spyOn(prisma.legalAcceptance, "findUnique").mockResolvedValue(null);

      const createdRecord = {
        id: "01918a20-0000-7000-8000-000000000099",
        userId: testUserId,
        versionId: testVersionId,
        acceptanceSource: "SIGNUP",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 TestBrowser",
        acceptedAt: new Date(),
        version: {
          versionString: "2026-08-25.1",
          document: { slug: "terms", title: "Terms of Service" },
        },
      };
      vi.spyOn(prisma.legalAcceptance, "create").mockResolvedValue(createdRecord as any);

      const res = await persistLegalAcceptanceToDb({
        userId: testUserId,
        documentSlug: "terms",
        versionString: "2026-08-25.1",
        acceptanceSource: "SIGNUP",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 TestBrowser",
      });

      expect(res).toBeDefined();
      expect(res.id).toBe(createdRecord.id);
      expect(res.acceptanceSource).toBe("SIGNUP");
      expect(res.ipAddress).toBe("192.168.1.100");
      expect(prisma.legalAcceptance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testUserId,
            versionId: testVersionId,
            acceptanceSource: "SIGNUP",
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0 TestBrowser",
          }),
        }),
      );
    });

    it("should be idempotent and not create duplicates when user already accepted", async () => {
      vi.spyOn(prisma.legalDocument, "findUnique").mockResolvedValue({
        id: testDocId,
        slug: "terms",
        title: "Terms of Service",
      } as any);
      vi.spyOn(prisma.legalDocumentVersion, "findUnique").mockResolvedValue({
        id: testVersionId,
        documentId: testDocId,
        versionString: "2026-08-25.1",
      } as any);

      const existingRecord = {
        id: "01918a20-0000-7000-8000-000000000088",
        userId: testUserId,
        versionId: testVersionId,
        acceptanceSource: "SIGNUP",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0",
        acceptedAt: new Date("2026-08-25T08:00:00Z"),
      };
      // Simulate existing acceptance in DB
      vi.spyOn(prisma.legalAcceptance, "findUnique").mockResolvedValue(existingRecord as any);

      const res = await persistLegalAcceptanceToDb({
        userId: testUserId,
        documentSlug: "terms",
        versionString: "2026-08-25.1",
        acceptanceSource: "TERMS_UPDATE",
        ipAddress: "10.0.0.1",
        userAgent: "Updated Browser",
      });

      expect(res.id).toBe(existingRecord.id);
      expect(prisma.legalAcceptance.create).not.toHaveBeenCalled();
    });
  });

  describe("getDbLegalAcceptancesForUser & hasUserAcceptedCurrentVersionInDb", () => {
    it("should query user acceptances ordered chronologically", async () => {
      const mockRecords = [
        {
          id: "rec-1",
          userId: "user-1",
          versionId: "ver-1",
          acceptanceSource: "SIGNUP",
          ipAddress: "1.1.1.1",
          acceptedAt: new Date("2026-08-25T00:00:00Z"),
          version: {
            versionString: "2026-08-01.1",
            document: { slug: "terms" },
          },
        },
      ];
      vi.spyOn(prisma.legalAcceptance, "findMany").mockResolvedValue(mockRecords as any);

      const records = await getDbLegalAcceptancesForUser("user-1");
      expect(records).toHaveLength(1);
      expect(prisma.legalAcceptance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          orderBy: { acceptedAt: "asc" },
        }),
      );
    });

    it("should return true when user has accepted current version", async () => {
      vi.spyOn(prisma.legalAcceptance, "count").mockResolvedValue(1);

      const hasAccepted = await hasUserAcceptedCurrentVersionInDb(
        "user-1",
        "terms",
        "2026-08-25.1",
      );

      expect(hasAccepted).toBe(true);
      expect(prisma.legalAcceptance.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            version: {
              versionString: "2026-08-25.1",
              document: {
                slug: "terms",
              },
            },
          },
        }),
      );
    });

    it("should return false when user has not accepted current version", async () => {
      vi.spyOn(prisma.legalAcceptance, "count").mockResolvedValue(0);

      const hasAccepted = await hasUserAcceptedCurrentVersionInDb(
        "user-2",
        "terms",
        "2026-08-25.1",
      );

      expect(hasAccepted).toBe(false);
    });
  });
});
