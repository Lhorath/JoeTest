import { describe, it, expect, vi, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { IdempotencyService } from "../idempotency.service";
import { PrismaClient, ApiIdempotencyStatus } from "@platform/database";
import { ConflictException, BadRequestException } from "@nestjs/common";

describe("IdempotencyService", () => {
  let service: IdempotencyService;

  const mockPrisma = {
    apiIdempotencyRecord: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        { provide: PrismaClient, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
    vi.clearAllMocks();
  });

  it("should successfully claim a new lock", async () => {
    mockPrisma.apiIdempotencyRecord.create.mockResolvedValue({
      id: "record_1",
    });

    const result = await service.claimLock(
      "user_1",
      "key_1",
      "/test",
      "fingerprint_1",
    );
    expect(result.claimed).toBe(true);
    expect(result.record!.id).toBe("record_1");
  });

  it("should throw ConflictException on concurrent processing request", async () => {
    mockPrisma.apiIdempotencyRecord.create.mockRejectedValue({ code: "P2002" }); // Unique violation
    mockPrisma.apiIdempotencyRecord.findUnique.mockResolvedValue({
      id: "record_1",
      status: ApiIdempotencyStatus.PROCESSING,
    });

    await expect(
      service.claimLock("user_1", "key_1", "/test", "fingerprint_1"),
    ).rejects.toThrow(ConflictException);
  });

  it("should return cached response for completed identical request", async () => {
    mockPrisma.apiIdempotencyRecord.create.mockRejectedValue({ code: "P2002" }); // Unique violation
    mockPrisma.apiIdempotencyRecord.findUnique.mockResolvedValue({
      id: "record_1",
      status: ApiIdempotencyStatus.COMPLETED,
      requestFingerprint: "fingerprint_1",
      responseData: JSON.stringify({ success: true }),
    });

    const result = await service.claimLock(
      "user_1",
      "key_1",
      "/test",
      "fingerprint_1",
    );
    expect(result.claimed).toBe(false);
    expect(result.cachedResponse).toEqual({ success: true });
  });

  it("should throw BadRequestException if idempotency key reused with different body", async () => {
    mockPrisma.apiIdempotencyRecord.create.mockRejectedValue({ code: "P2002" }); // Unique violation
    mockPrisma.apiIdempotencyRecord.findUnique.mockResolvedValue({
      id: "record_1",
      status: ApiIdempotencyStatus.COMPLETED,
      requestFingerprint: "old_fingerprint",
      responseData: "{}",
    });

    await expect(
      service.claimLock("user_1", "key_1", "/test", "new_fingerprint"),
    ).rejects.toThrow(BadRequestException);
  });

  it("should allow retry if previous attempt failed", async () => {
    mockPrisma.apiIdempotencyRecord.create.mockRejectedValue({ code: "P2002" }); // Unique violation
    mockPrisma.apiIdempotencyRecord.findUnique.mockResolvedValue({
      id: "record_1",
      status: ApiIdempotencyStatus.FAILED,
      requestFingerprint: "old_fingerprint",
    });
    mockPrisma.apiIdempotencyRecord.update.mockResolvedValue({
      id: "record_1",
      status: ApiIdempotencyStatus.PROCESSING,
    });

    const result = await service.claimLock(
      "user_1",
      "key_1",
      "/test",
      "new_fingerprint",
    );
    expect(result.claimed).toBe(true);
    expect(mockPrisma.apiIdempotencyRecord.update).toHaveBeenCalled();
  });
});
