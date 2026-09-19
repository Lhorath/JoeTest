import { describe, it, expect, vi, beforeEach } from "vitest";
import { LiveSessionsService } from "../live-sessions.service";
import { getCurrentWeeklyPeriod, NORMAL_PLAY_RATE_LIMIT_MS } from "@platform/config";

describe("Weekly Top 3 & Period Boundaries", () => {
  describe("getCurrentWeeklyPeriod (America/New_York Saturday 00:00 reset)", () => {
    it("should correctly identify current period start and end across Saturday boundary", () => {
      // 2026-03-07 was a Saturday
      // 2026-03-06 23:59:00 NY time is Friday before midnight
      // 2026-03-07 00:00:00 NY time is Saturday reset
      // In early March before DST (standard time UTC-5):
      // 2026-03-06 23:59:00 NY is 2026-03-07T04:59:00Z
      // 2026-03-07 00:01:00 NY is 2026-03-07T05:01:00Z

      const fridayNightUtc = new Date("2026-03-07T04:59:00Z");
      const saturdayMorningUtc = new Date("2026-03-07T05:01:00Z");

      const periodFriday = getCurrentWeeklyPeriod(fridayNightUtc);
      const periodSaturday = getCurrentWeeklyPeriod(saturdayMorningUtc);

      // Period Friday started on Saturday Feb 28
      expect(periodFriday.startDate.toISOString()).toBe("2026-02-28T05:00:00.000Z");
      expect(periodFriday.endDate.toISOString()).toBe("2026-03-07T05:00:00.000Z");

      // Period Saturday started on Saturday Mar 7
      expect(periodSaturday.startDate.toISOString()).toBe("2026-03-07T05:00:00.000Z");
      // Mar 7 to Mar 14 (crosses DST on Mar 8, so end is 2026-03-14T04:00:00Z EDT UTC-4)
      expect(periodSaturday.endDate.toISOString()).toBe("2026-03-14T04:00:00.000Z");
    });
  });

  describe("LiveSessionsService.getWeeklyTop3 Aggregation & Rate Limiting", () => {
    let service: LiveSessionsService;

    const mockPrisma = {
      station: {
        findFirst: vi.fn(),
      },
      liveSession: {
        findUnique: vi.fn(),
      },
      queueEntry: {
        findMany: vi.fn(),
      },
      playbackEvent: {
        create: vi.fn(),
      },
    };

    const mockEventService = {
      emit: vi.fn(),
    };

    const mockQueueOrderingService = {};

    beforeEach(() => {
      vi.clearAllMocks();
      service = new LiveSessionsService(
        mockPrisma as any,
        mockQueueOrderingService as any,
        mockEventService as any,
      );
    });

    it("enforces 4-hour rate limit on normal plays but allows paid priority to bypass", async () => {
      const stationId = "station-uuid-1";
      const referenceDate = new Date("2026-03-10T12:00:00Z"); // Tuesday

      mockPrisma.station.findFirst.mockResolvedValue({
        id: stationId,
        stationName: "The Jazz Station",
        slug: "the-jazz-station",
        host: {
          user: { displayName: "DJ Miles" },
        },
      });

      const baseTime = new Date("2026-03-08T10:00:00Z").getTime();

      // Track A has 3 normal plays:
      // Play 1: 10:00 (counts)
      // Play 2: 12:00 (within 4 hours -> ignored)
      // Play 3: 15:00 (5 hours after Play 1 -> counts)
      // Total Track A = 2 qualifying plays

      // Track B has 2 normal plays + 2 priority plays:
      // Play 1: 10:00 normal (counts)
      // Play 2: 11:00 priority (counts immediately, bypasses rate limit)
      // Play 3: 12:00 priority (counts immediately, bypasses rate limit)
      // Play 4: 13:00 normal (within 4 hours of Play 1 -> ignored)
      // Total Track B = 3 qualifying plays

      mockPrisma.queueEntry.findMany.mockResolvedValue([
        // Track A
        {
          id: "qe-a-1",
          wasPlayed: true,
          completedAt: new Date(baseTime),
          submission: {
            isPriority: false,
            sourceTrackId: "track-a",
            trackSnapshot: { songName: "Blue in Green", artistName: "Miles Davis" },
          },
        },
        {
          id: "qe-a-2",
          wasPlayed: true,
          completedAt: new Date(baseTime + 2 * 3600 * 1000), // 2 hours later
          submission: {
            isPriority: false,
            sourceTrackId: "track-a",
            trackSnapshot: { songName: "Blue in Green", artistName: "Miles Davis" },
          },
        },
        {
          id: "qe-a-3",
          wasPlayed: true,
          completedAt: new Date(baseTime + 5 * 3600 * 1000), // 5 hours later
          submission: {
            isPriority: false,
            sourceTrackId: "track-a",
            trackSnapshot: { songName: "Blue in Green", artistName: "Miles Davis" },
          },
        },
        // Track B
        {
          id: "qe-b-1",
          wasPlayed: true,
          completedAt: new Date(baseTime),
          submission: {
            isPriority: false,
            sourceTrackId: "track-b",
            trackSnapshot: { songName: "So What", artistName: "Miles Davis" },
          },
        },
        {
          id: "qe-b-2",
          wasPlayed: true,
          completedAt: new Date(baseTime + 1 * 3600 * 1000), // 1 hr later priority
          submission: {
            isPriority: true,
            sourceTrackId: "track-b",
            trackSnapshot: { songName: "So What", artistName: "Miles Davis" },
          },
        },
        {
          id: "qe-b-3",
          wasPlayed: true,
          completedAt: new Date(baseTime + 2 * 3600 * 1000), // 2 hrs later priority
          submission: {
            isPriority: true,
            sourceTrackId: "track-b",
            trackSnapshot: { songName: "So What", artistName: "Miles Davis" },
          },
        },
        {
          id: "qe-b-4",
          wasPlayed: true,
          completedAt: new Date(baseTime + 3 * 3600 * 1000), // 3 hrs later normal
          submission: {
            isPriority: false,
            sourceTrackId: "track-b",
            trackSnapshot: { songName: "So What", artistName: "Miles Davis" },
          },
        },
      ]);

      const result = await service.getWeeklyTop3(stationId, referenceDate);

      expect(result.stationId).toBe(stationId);
      expect(result.stationName).toBe("The Jazz Station");
      expect(result.hostName).toBe("DJ Miles");
      expect(result.items.length).toBe(2);

      // Rank 1: Track B (3 plays)
      expect(result.items[0].songName).toBe("So What");
      expect(result.items[0].qualifyingPlayCount).toBe(3);
      expect(result.items[0].rank).toBe(1);

      // Rank 2: Track A (2 plays)
      expect(result.items[1].songName).toBe("Blue in Green");
      expect(result.items[1].qualifyingPlayCount).toBe(2);
      expect(result.items[1].rank).toBe(2);
    });

    it("applies deterministic tie-breaking (count DESC, recent DESC, id ASC) and caps at Top 3", async () => {
      const stationId = "station-uuid-1";
      const referenceDate = new Date("2026-03-10T12:00:00Z");

      mockPrisma.station.findFirst.mockResolvedValue({
        id: stationId,
        stationName: "The Rock Station",
        slug: "the-rock-station",
        host: {
          user: { displayName: "DJ Rock" },
        },
      });

      // 4 songs with 1 qualifying play each, different timestamps
      mockPrisma.queueEntry.findMany.mockResolvedValue([
        {
          id: "qe-1",
          wasPlayed: true,
          completedAt: new Date("2026-03-08T10:00:00Z"),
          submission: {
            isPriority: false,
            sourceTrackId: "track-1",
            trackSnapshot: { songName: "Song 1", artistName: "Artist A" },
          },
        },
        {
          id: "qe-2",
          wasPlayed: true,
          completedAt: new Date("2026-03-08T15:00:00Z"), // Most recent
          submission: {
            isPriority: false,
            sourceTrackId: "track-2",
            trackSnapshot: { songName: "Song 2", artistName: "Artist B" },
          },
        },
        {
          id: "qe-3",
          wasPlayed: true,
          completedAt: new Date("2026-03-08T12:00:00Z"), // Second most recent
          submission: {
            isPriority: false,
            sourceTrackId: "track-3",
            trackSnapshot: { songName: "Song 3", artistName: "Artist C" },
          },
        },
        {
          id: "qe-4",
          wasPlayed: true,
          completedAt: new Date("2026-03-08T11:00:00Z"), // Third most recent
          submission: {
            isPriority: false,
            sourceTrackId: "track-4",
            trackSnapshot: { songName: "Song 4", artistName: "Artist D" },
          },
        },
      ]);

      const result = await service.getWeeklyTop3(stationId, referenceDate);

      // Capped at 3 items
      expect(result.items.length).toBe(3);

      // Rank 1: Song 2 (15:00)
      expect(result.items[0].songName).toBe("Song 2");
      expect(result.items[0].rank).toBe(1);

      // Rank 2: Song 3 (12:00)
      expect(result.items[1].songName).toBe("Song 3");
      expect(result.items[1].rank).toBe(2);

      // Rank 3: Song 4 (11:00)
      expect(result.items[2].songName).toBe("Song 4");
      expect(result.items[2].rank).toBe(3);
    });
  });
});
