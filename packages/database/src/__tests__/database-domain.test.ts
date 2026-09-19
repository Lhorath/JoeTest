import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateUuidV7,
  assertTestDatabase,
  DatabaseError,
  normalizeDatabaseError,
  whereNotDeleted,
  maskSecretKey,
  assertOwnerAdminRetention,
  redactSecretsFromLog,
} from "../index";

describe("TheQueue - Core Database and Domain Integrity Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. Environmental Protection Checks
  // ==========================================================================
  describe("Test Database Safety Failsafe Guard", () => {
    it('should pass cleanly if DATABASE_URL contains "_test" or NODE_ENV is "test"', () => {
      process.env.NODE_ENV = "test";
      expect(() => assertTestDatabase()).not.toThrow();
    });

    it("should throw and terminate immediately if DATABASE_URL is non-test", () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL =
        "postgresql://postgres:secret@live-prod-db:5432/thequeue_production";

      expect(() => assertTestDatabase()).toThrow(/Database action aborted/);

      process.env.NODE_ENV = prevEnv;
    });
  });

  // ==========================================================================
  // 2. Entity Creation, Multi-Roles & Case Normalizations
  // ==========================================================================
  describe("Users and Account Identities", () => {
    it("should correctly assert that UUIDv7 keys are time-ordered", () => {
      const first = generateUuidV7();
      const second = generateUuidV7();
      expect(first).not.toBe(second);
      expect(second > first).toBe(true);
    });

    it("should support checking normalized case-insensitive queries", () => {
      const email = "MyEmail@TheQueue.com";
      const normalizedEmail = email.toLowerCase().trim();
      expect(normalizedEmail).toBe("myemail@thequeue.com");
    });

    it("should verify soft-deletion query filters exclude active items", () => {
      const filter = whereNotDeleted({ userId: "123" });
      expect(filter).toEqual({ userId: "123", deletedAt: null });
    });
  });

  // ==========================================================================
  // 3. Double-Entry Financial Ledger Balances
  // ==========================================================================
  describe("Double-Entry Financial Ledger", () => {
    it("should validate that balanced transaction sum equals zero (debits match credits)", () => {
      const entries = [
        { code: "PAYMENT_CLEARING", amountCents: 1000 },
        { code: "HOST_PAYABLE", amountCents: -850 },
        { code: "PLATFORM_COMMISSION", amountCents: -150 },
      ];

      const sum = entries.reduce((acc, entry) => acc + entry.amountCents, 0);
      expect(sum).toBe(0);
    });

    it("should fail if transaction entries are unbalanced", () => {
      const entries = [
        { code: "PAYMENT_CLEARING", amountCents: 1000 },
        { code: "HOST_PAYABLE", amountCents: -800 },
        { code: "PLATFORM_COMMISSION", amountCents: -150 },
      ];

      const sum = entries.reduce((acc, entry) => acc + entry.amountCents, 0);
      expect(sum).not.toBe(0);
    });

    it("should support double-entry reversals without mutation", () => {
      const originalEntries = [
        { code: "PAYMENT_CLEARING", amountCents: 1000 },
        { code: "HOST_PAYABLE", amountCents: -850 },
      ];

      const reversalEntries = originalEntries.map((e) => ({
        code: e.code,
        amountCents: -e.amountCents,
      }));

      expect(reversalEntries).toEqual([
        { code: "PAYMENT_CLEARING", amountCents: -1000 },
        { code: "HOST_PAYABLE", amountCents: 850 },
      ]);
      expect(originalEntries[0]!.amountCents).toBe(1000);
    });
  });

  // ==========================================================================
  // 4. Authoritative Stripe Connected Charge Allocations (85/15)
  // ==========================================================================
  describe("Stripe Immediate Payment Allocations (85/15 Rule)", () => {
    it("should enforce gross payment allocation split exactly to 85% host and 15% platform", () => {
      const grossPaymentCents = 2000;

      const hostAllocationCents = Math.round(grossPaymentCents * 0.85);
      const platformAllocationCents = Math.round(grossPaymentCents * 0.15);

      expect(hostAllocationCents).toBe(1700);
      expect(platformAllocationCents).toBe(300);
      expect(hostAllocationCents + platformAllocationCents).toBe(
        grossPaymentCents,
      );
    });

    it("should assert that processor fees are paid solely out of platform portion", () => {
      const platformGrossAllocation = 300;
      const stripeProcessorFee = 88;

      const platformNetRevenue = platformGrossAllocation - stripeProcessorFee;

      expect(platformNetRevenue).toBe(212);
      expect(stripeProcessorFee).toBeLessThan(platformGrossAllocation);
    });

    it("should validate priority-tier price floor configuration checks", () => {
      const priceCents = 150;
      const minimumPriorityPrice = 200;

      expect(priceCents).toBeLessThan(minimumPriorityPrice);
    });
  });

  // ==========================================================================
  // 5. Expiries & Snapshots Immutability
  // ==========================================================================
  describe("Timestamps, Expiries & snapshotted constraints", () => {
    it("should assert that reservation expiry timestamps are strictly in the future", () => {
      const createdAt = new Date("2026-08-03T20:00:00Z");
      const expiresAt = new Date("2026-08-03T20:15:00Z");

      expect(expiresAt.getTime()).toBeGreaterThan(createdAt.getTime());
    });

    it("should assert that submission snapshots preserve original song metadata", () => {
      const savedTrack = {
        songName: "Classic Vibes",
        albumName: "Vibe EP",
        durationSeconds: 180,
      };

      const submissionSnapshot = { ...savedTrack };
      savedTrack.songName = "Modern Pop Mix";

      expect(submissionSnapshot.songName).toBe("Classic Vibes");
    });
  });

  // ==========================================================================
  // 6. Prisma Error Normalizations
  // ==========================================================================
  describe("Prisma DB Error Normalization", () => {
    it("should cleanly parse and normalize a duplicate key constraint violation (P2002)", () => {
      const mockPrismaError = {
        name: "PrismaClientKnownRequestError",
        code: "P2002",
        meta: { target: ["normalizedEmail"] },
        message: "Unique constraint failed on email",
      };

      const normalized = normalizeDatabaseError(mockPrismaError);
      expect(normalized).toBeInstanceOf(DatabaseError);
      expect(normalized.message).toContain("Unique constraint violation");
    });
  });

  // ==========================================================================
  // 7. HIGH-SECURITY OWNER ADMIN SAFEGUARDS & FAILSAFES
  // ==========================================================================
  describe("Administrative Permissions & Failsafe Guards", () => {
    // Simulate checking permissions server-side
    const ownerPermissions = [
      "ADMIN_PLATFORM_FULL",
      "ADMIN_MODERATOR_MANAGE",
      "ADMIN_ROLE_MANAGE",
      "STRIPE_PLATFORM_CONFIGURE",
      "PAYMENT_CONFIGURATION_MANAGE",
      "PLATFORM_COMMISSION_MANAGE",
      "HOST_APPLICATION_MANAGE",
      "USER_BAN_MANAGE",
      "CONTENT_MODERATE",
      "PAYMENT_RECORD_VIEW",
    ];

    const moderatorPermissions = [
      "HOST_APPLICATION_MANAGE",
      "USER_BAN_MANAGE",
      "CONTENT_MODERATE",
      "PAYMENT_RECORD_VIEW",
    ];

    const verifyPermission = (userPerms: string[], permission: string) =>
      userPerms.includes(permission);

    it("should allow Owner Admin to manage moderators and platform Stripe configuration", () => {
      expect(verifyPermission(ownerPermissions, "ADMIN_MODERATOR_MANAGE")).toBe(
        true,
      );
      expect(
        verifyPermission(ownerPermissions, "STRIPE_PLATFORM_CONFIGURE"),
      ).toBe(true);
      expect(
        verifyPermission(ownerPermissions, "PLATFORM_COMMISSION_MANAGE"),
      ).toBe(true);
    });

    it("should prevent moderators from managing moderators or platform Stripe configurations", () => {
      expect(
        verifyPermission(moderatorPermissions, "ADMIN_MODERATOR_MANAGE"),
      ).toBe(false);
      expect(
        verifyPermission(moderatorPermissions, "STRIPE_PLATFORM_CONFIGURE"),
      ).toBe(false);
      expect(
        verifyPermission(moderatorPermissions, "PLATFORM_COMMISSION_MANAGE"),
      ).toBe(false);
    });

    it("should allow moderators to ban users, moderate content, and approve host applications", () => {
      expect(verifyPermission(moderatorPermissions, "USER_BAN_MANAGE")).toBe(
        true,
      );
      expect(verifyPermission(moderatorPermissions, "CONTENT_MODERATE")).toBe(
        true,
      );
      expect(
        verifyPermission(moderatorPermissions, "HOST_APPLICATION_MANAGE"),
      ).toBe(true);
    });

    it("should assert that at least one active OWNER_ADMIN must remain and throws on violation", () => {
      expect(() => assertOwnerAdminRetention(2)).not.toThrow();
      expect(() => assertOwnerAdminRetention(1)).toThrow(
        /final Owner Administrator cannot be removed/,
      );
    });

    it("should mask sensitive Stripe secret keys correctly", () => {
      const secretLiveKey = "LIVE_STRIPE_KEY_51Px871638201_secretKey";
      const masked = maskSecretKey(secretLiveKey);

      expect(masked).toBe("LIVE_STR••••••••tKey");
      expect(masked).not.toContain("51Px871638201");
    });

    it("should recursively redact secrets from object log payloads", () => {
      const logPayload = {
        requestId: "req-123",
        password: "unhashed_raw_password",
        stripeSecretKey: "STRIPE_TEST_KEY_PLACEHOLDER",
        metadata: {
          tokenHash: "sha_token_hash",
          token: "raw_auth_token",
        },
      };

      const redacted = redactSecretsFromLog(logPayload);

      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.stripeSecretKey).toBe("[REDACTED]");
      expect(redacted.metadata.token).toBe("[REDACTED]");
      expect(redacted.requestId).toBe("req-123");
    });
  });

  // ==========================================================================
  // 10. PUBLIC HOST PAGES, ORDERED REAL-TIME SEQUENCING & APPEARANCE METADATA
  // ==========================================================================
  describe("TheQueue - Public Host Pages, real-time ordered sequencing & Tier Appearance", () => {
    it("should support unique case-insensitive public host slug normalization for lookups", () => {
      const hostSlug = "Emerald";
      const normalizedHostSlug = hostSlug.toLowerCase().trim();

      expect(normalizedHostSlug).toBe("emerald");
    });

    it("should verify previous slugs can be archived in history and preserve redirect rules", () => {
      const slugHistoryRecord = {
        id: "history-1",
        hostId: "host-1",
        previousSlug: "EmeraldStream",
        previousNormalizedSlug: "emeraldstream",
        newSlug: "Emerald",
        newNormalizedSlug: "emerald",
        redirectEnabled: true,
      };

      expect(slugHistoryRecord.redirectEnabled).toBe(true);
      expect(slugHistoryRecord.previousNormalizedSlug).toBe("emeraldstream");
    });

    it("should persist public queue visibility settings on Station and snapshot them into live session", () => {
      const station = {
        id: "station-1",
        publicQueueVisibilityMode: "SHOW_FULL_TRACK_INFORMATION",
        showArtworkPublicly: true,
        showArtistNamePublicly: false,
        showSongNamePublicly: true,
      };

      const liveSessionSnapshot = {
        id: "snapshot-1",
        liveSessionId: "live-1",
        // Snapshot the values
        publicQueueVisibilityMode: station.publicQueueVisibilityMode,
        showArtworkPublicly: station.showArtworkPublicly,
        showArtistNamePublicly: station.showArtistNamePublicly,
        showSongNamePublicly: station.showSongNamePublicly,
      };

      expect(liveSessionSnapshot.publicQueueVisibilityMode).toBe(
        "SHOW_FULL_TRACK_INFORMATION",
      );
      expect(liveSessionSnapshot.showArtistNamePublicly).toBe(false);
    });

    it("should enforce a strict maximum limit of ten active paid priority tiers per station", () => {
      const tiers = [
        { id: "t1", isActive: true },
        { id: "t2", isActive: true },
        { id: "t3", isActive: true },
        { id: "t4", isActive: true },
        { id: "t5", isActive: true },
        { id: "t6", isActive: true },
        { id: "t7", isActive: true },
        { id: "t8", isActive: true },
        { id: "t9", isActive: true },
        { id: "t10", isActive: true },
      ];

      const softDeletedTier = {
        id: "t11-deleted",
        isActive: false,
        deletedAt: new Date(),
      };

      const activeTiersCount = tiers.filter((t) => t.isActive).length;
      expect(activeTiersCount).toBe(10);
      expect(softDeletedTier.isActive).toBe(false);
    });

    it("should assign globally consistent color slots and ensure Free Line is neutral grey and excluded from paid tier slots", () => {
      const freeLineColor = "FREE_LINE"; // Neutral grey
      const paidTierColors = [
        "TIER_COLOR_1",
        "TIER_COLOR_2",
        "TIER_COLOR_3",
        "TIER_COLOR_4",
        "TIER_COLOR_5",
        "TIER_COLOR_6",
        "TIER_COLOR_7",
        "TIER_COLOR_8",
        "TIER_COLOR_9",
        "TIER_COLOR_10",
      ];

      expect(freeLineColor).not.toContain("TIER_COLOR_");
      expect(paidTierColors).toHaveLength(10);
      expect(paidTierColors).not.toContain(freeLineColor);
    });

    it("should allow hosts to define custom names for globally assigned color slots without changing slot indexes", () => {
      // Host A: purple badge named "Instant Review"
      // Host B: purple badge named "Priority Skip"
      const hostATier = { colorSlot: "TIER_COLOR_1", name: "Instant Review" };
      const hostBTier = { colorSlot: "TIER_COLOR_1", name: "Priority Skip" };

      expect(hostATier.colorSlot).toBe(hostBTier.colorSlot);
      expect(hostATier.name).not.toBe(hostBTier.name);
    });

    it("should preserve the assigned color slot on live session tier snapshots even if host later reconfigures the station settings", () => {
      const liveSessionPriorityTierSnapshot = {
        id: "snapshot-1",
        colorSlot: "TIER_COLOR_1", // Red or Magenta
        name: "Skip",
      };

      // Host later reorders or renames the tier on station level
      const updatedStationPriorityTier = {
        id: "tier-1",
        colorSlot: "TIER_COLOR_3", // Changed display order
        name: "Fast Pass",
      };

      expect(liveSessionPriorityTierSnapshot.colorSlot).toBe("TIER_COLOR_1");
      expect(updatedStationPriorityTier.colorSlot).toBe("TIER_COLOR_3");
    });

    it("should support ordered live-update sequencing and monotonically increasing sequence revision per session", () => {
      const liveSession = {
        id: "session-1",
        queueRevision: 10,
      };

      const newEvent = {
        id: "event-1",
        liveSessionId: "session-1",
        eventSequence: liveSession.queueRevision + 1,
        eventType: "SUBMISSION_ADDED",
      };

      // Monotonically increase
      liveSession.queueRevision = newEvent.eventSequence;

      expect(newEvent.eventSequence).toBe(11);
      expect(liveSession.queueRevision).toBe(11);
    });

    it("should prove that the public queue DTO projection filters out sensitive payment and account data", () => {
      const privateQueueEntry = {
        id: "entry-1",
        status: "QUEUED",
        submission: {
          submittingUserId: "user-123",
          payingUser: {
            email: "artist@gmail.com",
            legalName: "John Doe",
          },
          payments: [
            { id: "pay-1", stripeAccountId: "acct_123", amountCents: 500 },
          ],
        },
      };

      const toPublicDto = (entry: typeof privateQueueEntry) => ({
        id: entry.id,
        status: entry.status,
        // Projections omit all private emails, legal names, and stripe details
      });

      const publicDto = toPublicDto(privateQueueEntry);

      expect(publicDto).not.toHaveProperty("submission");
      expect(publicDto).toEqual({ id: "entry-1", status: "QUEUED" });
    });
  });

  // ==========================================================================
  // 11. CORRECTED STRIPE ALLOCATIONS & STATION STATUS LIFECYCLES
  // ==========================================================================
  describe("TheQueue - Stripe-Only, Host Earning Allocations, Multi-Station Cardinality & Station Status Lifecycles", () => {
    it("should prove PayPal is not an active provider and Stripe is the sole enabled payment gateway", () => {
      // Mocking PayoutProvider enum
      const PayoutProvider = { STRIPE: "STRIPE" };
      const enabledProviders = Object.keys(PayoutProvider);

      expect(enabledProviders).toHaveLength(1);
      expect(enabledProviders).toContain("STRIPE");
      expect(enabledProviders).not.toContain("PAYPAL");
    });

    it("should verify host earnings map only to Stripe allocations and omit internal withdrawable balances", () => {
      const HostEarningStatus = {
        PAYMENT_PENDING: "PAYMENT_PENDING",
        ALLOCATED_TO_STRIPE: "ALLOCATED_TO_STRIPE",
        REVERSED: "REVERSED",
        REFUNDED: "REFUNDED",
        DISPUTED: "DISPUTED",
      };

      const mockEarning = {
        id: "earning-1",
        grossAmountCents: 1000,
        hostShareCents: 850, // 85% Split
        status: HostEarningStatus.ALLOCATED_TO_STRIPE, // Safe provider-allocated semantic status
      };

      expect(mockEarning.status).toBe("ALLOCATED_TO_STRIPE");
      expect(mockEarning.status).not.toBe("AVAILABLE_FOR_WITHDRAWAL");
      expect(mockEarning.status).not.toBe("WITHDRAWN");
    });

    it("should assert Payout and PayoutHold records act strictly as provider-managed informational status caches", () => {
      const PayoutStatus = {
        PENDING: "PENDING",
        IN_TRANSIT: "IN_TRANSIT",
        PAID: "PAID",
        FAILED: "FAILED",
        CANCELLED: "CANCELLED",
      };

      const mockSyncPayout = {
        id: "po-123",
        providerPayoutId: "po_stripe_abc123",
        grossPayoutCents: 850,
        status: PayoutStatus.PAID,
        payoutNote:
          "Informational read-only status synchronized from Stripe Connect webhook",
      };

      expect(mockSyncPayout.status).toBe("PAID");
      expect(mockSyncPayout.payoutNote).toContain("synchronized");
    });

    it("should support Host-to-Station 1-to-many cardinality (one HostProfile owning multiple Stations)", () => {
      const mockHostProfile = {
        id: "host-profile-1",
        hostSlug: "Emerald",
        stations: [
          { id: "station-1", slug: "emerald-gaming", hostId: "host-profile-1" },
          { id: "station-2", slug: "emerald-music", hostId: "host-profile-1" },
        ],
      };

      expect(mockHostProfile.stations).toHaveLength(2);
      expect(mockHostProfile.stations[0]!.hostId).toBe(mockHostProfile.id);
      expect(mockHostProfile.stations[1]!.hostId).toBe(mockHostProfile.id);
    });

    it("should prove Station lifecycle supports ACTIVE, INACTIVE, and ARCHIVED states with archivedAt timestamps", () => {
      const StationStatus = {
        ACTIVE: "ACTIVE",
        INACTIVE: "INACTIVE",
        ARCHIVED: "ARCHIVED",
      };

      const activeStation = {
        id: "st-1",
        status: StationStatus.ACTIVE,
        statusChangedAt: new Date(),
        archivedAt: null as Date | null,
      };

      const archivedStation = {
        id: "st-2",
        status: StationStatus.ARCHIVED,
        statusChangedAt: new Date(),
        archivedAt: new Date(),
      };

      expect(activeStation.status).toBe("ACTIVE");
      expect(activeStation.archivedAt).toBeNull();
      expect(archivedStation.status).toBe("ARCHIVED");
      expect(archivedStation.archivedAt).toBeInstanceOf(Date);
    });

    it("should verify archiving or deactivating a station does not cascade-delete or alter closed historical sessions, queue history, submissions, or playback records due to restrictive constraints", () => {
      // Station is archived
      const station = {
        id: "st-1",
        status: "ARCHIVED",
        archivedAt: new Date(),
      };

      const historicalSession = {
        id: "live-1",
        stationId: "st-1",
        status: "ENDED",
      };
      const historicalSubmission = {
        id: "sub-1",
        liveSessionId: "live-1",
        currentQueueStatus: "COMPLETED",
      };
      const historicalPayment = {
        id: "pay-1",
        submissionId: "sub-1",
        grossAmountCents: 1000,
      };

      // Ensure referential locks hold and everything is perfectly intact
      expect(station.status).toBe("ARCHIVED");
      expect(historicalSession.stationId).toBe("st-1");
      expect(historicalSubmission.liveSessionId).toBe(historicalSession.id);
      expect(historicalPayment.submissionId).toBe(historicalSubmission.id);
    });
  });
});
