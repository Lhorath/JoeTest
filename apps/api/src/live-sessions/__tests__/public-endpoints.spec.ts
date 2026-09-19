import { describe, it, expect, vi, beforeEach } from "vitest";
import { LiveSessionsService } from "../live-sessions.service";
import { LiveSessionsEventService } from "../live-sessions-event.service";
import { LiveSessionsGateway } from "../live-sessions.gateway";
import { LiveSessionStatus, QueueStatus, StreamingPlatform } from "@platform/types";

describe("LiveSessionsService - Public Read Endpoints", () => {
  let service: LiveSessionsService;

  const mockPrisma = {
    liveSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    queueEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  const mockEventService = {
    emitToPublic: vi.fn(),
    emitToHost: vi.fn(),
  };

  const mockGateway = {};

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LiveSessionsService(
      mockPrisma as any,
      mockEventService as any,
      mockGateway as any,
    );
  });

  describe("getPublicLiveSessions", () => {
    it("should return sanitized public live session summaries", async () => {
      const mockDbSessions = [
        {
          id: "session-1",
          stationId: "station-1",
          liveTitle: "Friday Night Review",
          status: LiveSessionStatus.LIVE,
          startedAt: new Date("2026-01-01T00:00:00Z"),
          primaryStreamingPlatform: StreamingPlatform.TWITCH,
          sessionLiveUrl: "https://twitch.tv/djhost",
          savedProfileUrlSnapshot: "https://twitch.tv/djhost",
          submissionsOpen: true,
          freeLineOpen: true,
          paidSubmissionsOpen: true,
          station: {
            stationName: "The Beat Station",
            slug: "the-beat-station",
            host: {
              publicHostName: "DJ Host",
            },
          },
        },
      ];

      mockPrisma.liveSession.findMany.mockResolvedValue(mockDbSessions);

      const result = await service.getPublicLiveSessions();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "session-1",
        stationId: "station-1",
        stationName: "The Beat Station",
        stationSlug: "the-beat-station",
        hostName: "DJ Host",
        liveTitle: "Friday Night Review",
        status: LiveSessionStatus.LIVE,
        startedAt: new Date("2026-01-01T00:00:00Z"),
        primaryStreamingPlatform: StreamingPlatform.TWITCH,
        streamUrl: "https://twitch.tv/djhost",
        submissionsOpen: true,
        freeLineOpen: true,
        paidSubmissionsOpen: true,
      });
    });
  });

  describe("getPublicQueue", () => {
    it("should return sanitized queue entries sorted by priorityRank and sortOrder", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue({
        id: "session-1",
      });

      const mockEntries = [
        {
          id: "entry-1",
          liveSessionId: "session-1",
          status: QueueStatus.QUEUED,
          sortOrder: 1000,
          priorityRank: 5,
          submission: {
            isPriority: true,
            submittedAt: new Date("2026-01-01T00:00:00Z"),
            trackSnapshot: {
              songName: "Track A",
              artistName: "Artist A",
              durationSeconds: 180,
            },
            priorityTierSnapshot: {
              name: "Gold Priority",
              colorSlot: "TIER_COLOR_1",
            },
          },
        },
      ];

      mockPrisma.queueEntry.findMany.mockResolvedValue(mockEntries);

      const result = await service.getPublicQueue("session-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "entry-1",
        liveSessionId: "session-1",
        status: QueueStatus.QUEUED,
        sortOrder: 1000,
        priorityRank: 5,
        isPriority: true,
        tierName: "Gold Priority",
        colorSlot: "TIER_COLOR_1",
        songName: "Track A",
        artistName: "Artist A",
        durationSeconds: 180,
        submittedAt: new Date("2026-01-01T00:00:00Z"),
      });
    });
  });
});
