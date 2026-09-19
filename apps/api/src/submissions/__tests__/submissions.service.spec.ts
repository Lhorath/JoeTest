import { describe, it, expect, vi, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { SubmissionsService } from "../submissions.service";
import { SubmissionEligibilityService } from "../submission-eligibility.service";
import { QueueOrderingService } from "../../live-sessions/queue-ordering/queue-ordering.service";
import { PrismaClient } from "@platform/database";
import { ConflictException } from "@nestjs/common";
import { IdempotencyService } from "../../common/idempotency/idempotency.service";
import { StripeService } from "../../payments/stripe.service";

describe("SubmissionsService", () => {
  let service: SubmissionsService;
  let eligibilityService: SubmissionEligibilityService;

  const mockPrisma = {
    $transaction: vi.fn(async (cb) => {
      return cb(mockPrisma);
    }),
    userLiveSubmissionUsage: { upsert: vi.fn() },
    track: {
      findUnique: vi.fn().mockResolvedValue({
        id: "tr_1",
        userId: "user_1",
        songName: "Test Song",
        albumName: "Test Album",
        genre: "Electronic",
        explicitContent: false,
        releaseDate: new Date(),
        artworkS3Key: "artwork.jpg",
        sourceType: "DIRECT_UPLOAD",
        playbackCapability: "STEREO",
        currentMediaVersionId: "mv_1",
        durationSeconds: 180,
        processingState: "READY",
        storageStatus: "AVAILABLE",
        deletedAt: null,
      }),
    },
    artistIdentity: {
      findUnique: vi.fn().mockResolvedValue({
        id: "art_1",
        userId: "user_1",
        artistName: "Test Artist",
        deletedAt: null,
      }),
    },
    submissionTrackSnapshot: { create: vi.fn() },
    priorityTierReservation: { create: vi.fn() },
    queueEvent: { create: vi.fn() },
    livePriorityTierSnapshot: {
      findUnique: vi.fn().mockResolvedValue({
        id: "ts_1",
        priorityTierId: "pt_1",
      }),
    },
    submission: {
      create: vi.fn().mockResolvedValue({
        id: "sub_1",
        liveSessionId: "ls_1",
        queueEntry: { id: "qe_1" },
      }),
      findUnique: vi.fn(),
    },
    queueEntry: {
      create: vi.fn().mockResolvedValue({ id: "qe_1" }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    payment: { create: vi.fn() },
    liveSession: {
      findUnique: vi.fn().mockResolvedValue({
        id: "ls_1",
        station: {
          host: {
            payoutAccounts: [{ providerAccountId: "acct_123" }],
          },
        },
      }),
      update: vi.fn().mockResolvedValue({ id: "ls_1" }),
    },
    stripePlatformConfiguration: {
      findFirst: vi.fn().mockResolvedValue({ isPaymentsEnabled: true }),
    },
    paymentEmergencyControl: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };

  const mockEligibilityService = {
    getEligibility: vi.fn(),
  };

  const mockQueueOrderingService = {
    calculateNewSortOrder: vi.fn().mockReturnValue({ midpoint: 0 }),
  };

  const mockIdempotencyService = {
    claimLock: vi
      .fn()
      .mockResolvedValue({ claimed: true, record: { id: "lock_1" } }),
    releaseLock: vi.fn().mockResolvedValue(undefined),
  };

  const mockStripeService = {
    createPaymentIntent: vi
      .fn()
      .mockResolvedValue({ id: "pi_123", client_secret: "secret_123" }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaClient, useValue: mockPrisma },
        {
          provide: SubmissionEligibilityService,
          useValue: mockEligibilityService,
        },
        { provide: QueueOrderingService, useValue: mockQueueOrderingService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
        { provide: StripeService, useValue: mockStripeService },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
    eligibilityService = module.get<SubmissionEligibilityService>(
      SubmissionEligibilityService,
    );
    vi.clearAllMocks();
  });

  it("should block free submission if eligibility fails", async () => {
    mockEligibilityService.getEligibility.mockResolvedValue({
      free: { available: false, reason: "SOME_REASON" },
      priorityTiers: [],
    });

    await expect(
      service.createSubmission(
        "user_1",
        "ls_1",
        {
          sourceTrackId: "tr_1",
          artistIdentityId: "art_1",
        },
        "key1",
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("should create free submission if eligible", async () => {
    mockEligibilityService.getEligibility.mockResolvedValue({
      free: { available: true },
      priorityTiers: [],
    });

    const result = await service.createSubmission(
      "user_1",
      "ls_1",
      {
        sourceTrackId: "tr_1",
        artistIdentityId: "art_1",
      },
      "key2",
    );

    expect(mockPrisma.userLiveSubmissionUsage.upsert).toHaveBeenCalled();
    expect(mockPrisma.submission.create).toHaveBeenCalled();
    expect(mockPrisma.queueEntry.create).toHaveBeenCalled();
    expect(result.submission.id).toBe("sub_1");
  });

  it("should create unpaid priority submission if eligible", async () => {
    mockEligibilityService.getEligibility.mockResolvedValue({
      free: { available: true },
      priorityTiers: [
        {
          tierSnapshotId: "ts_1",
          available: true,
          priorityRank: 5,
          priceCents: 500,
        },
      ],
    });

    const result = await service.createSubmission(
      "user_1",
      "ls_1",
      {
        sourceTrackId: "tr_1",
        artistIdentityId: "art_1",
        tierSnapshotId: "ts_1",
      },
      "key3",
    );

    expect(mockPrisma.submission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPriority: true,
          priorityTierSnapshotId: "ts_1",
          currentQueueStatus: "AWAITING_PAYMENT",
        }),
      }),
    );
    expect(mockPrisma.queueEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "AWAITING_PAYMENT",
          priorityRank: 5,
        }),
      }),
    );
    expect(mockPrisma.payment.create).toHaveBeenCalled();
    expect(result.clientSecret).toBe("secret_123");
    expect(result.submission.id).toBe("sub_1");
  });

  it("should reject submission if user does not own track", async () => {
    mockPrisma.track.findUnique.mockResolvedValueOnce({
      id: "tr_other",
      userId: "different_user",
      processingState: "READY",
      storageStatus: "AVAILABLE",
      deletedAt: null,
    });

    await expect(
      service.createSubmission(
        "user_1",
        "ls_1",
        { sourceTrackId: "tr_other", artistIdentityId: "art_1" },
        "key4",
      ),
    ).rejects.toThrow("Forbidden: You can only submit tracks from your own library");
  });

  it("should reject submission if track is not ready for playback", async () => {
    mockPrisma.track.findUnique.mockResolvedValueOnce({
      id: "tr_processing",
      userId: "user_1",
      processingState: "PROCESSING",
      storageStatus: "AVAILABLE",
      deletedAt: null,
    });

    await expect(
      service.createSubmission(
        "user_1",
        "ls_1",
        { sourceTrackId: "tr_processing", artistIdentityId: "art_1" },
        "key5",
      ),
    ).rejects.toThrow("Track is not ready for playback");
  });

  it("should reject submission if user does not own artist identity", async () => {
    mockPrisma.artistIdentity.findUnique.mockResolvedValueOnce({
      id: "art_other",
      userId: "different_user",
      artistName: "Impostor",
      deletedAt: null,
    });

    await expect(
      service.createSubmission(
        "user_1",
        "ls_1",
        { sourceTrackId: "tr_1", artistIdentityId: "art_other" },
        "key6",
      ),
    ).rejects.toThrow("Forbidden: You cannot submit under an Artist Identity you do not own");
  });

  it("should reject upgrade if submission is not QUEUED", async () => {
    mockPrisma.submission.findUnique = vi.fn().mockResolvedValueOnce({
      id: "sub_1",
      submittingUserId: "user_1",
      isPriority: false,
      currentQueueStatus: "PLAYING",
      queueEntry: { status: "PLAYING" },
      liveSession: {
        status: "LIVE",
        station: { host: { payoutAccounts: [{ providerAccountId: "acct_1" }] } },
      },
    });

    await expect(
      service.upgradeSubmission("user_1", "sub_1", { tierSnapshotId: "ts_1" }, "upg_1"),
    ).rejects.toThrow("Only queued submissions can be upgraded to Priority");
  });
});
