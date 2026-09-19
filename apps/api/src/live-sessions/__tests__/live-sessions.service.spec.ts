import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { LiveSessionsService } from "../live-sessions.service";
import { QueueOrderingService } from "../queue-ordering/queue-ordering.service";
import { PrismaClient, generateUuidV7 } from "@platform/database";
import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  LiveSessionStatus,
  StreamingPlatform,
  QueueStatus,
} from "@platform/types";
import { LiveSessionsEventService } from "../live-sessions-event.service";

describe("LiveSessionsService", () => {
  let service: LiveSessionsService;
  let prisma: PrismaClient;

  // Use a transaction testing approach for tests touching the real database
  let dbTransaction: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveSessionsService,
        QueueOrderingService,
        LiveSessionsEventService,
        {
          provide: PrismaClient,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<LiveSessionsService>(LiveSessionsService);
  });

  describe("createLiveSession", () => {
    it("should create a live session for an authenticated host", async () => {
      // Need real DB records for host, station etc to fully test.
      // We will rely on e2e tests for complete database interactions to avoid heavy mocking here
      // or write integration tests in a separate suite. For this foundational slice,
      // we'll mock the Prisma calls for pure unit testing of business logic.
      const mockHostId = generateUuidV7();
      const mockStationId = generateUuidV7();

      const prismaMock = {
        $transaction: vi.fn(async (cb) => cb(prismaMock)),
        $queryRaw: vi.fn().mockImplementation((query) => {
          if (query && query[0] && query[0].includes("host_profiles")) {
            return [{ id: "host1" }];
          }
          return [];
        }),
        station: {
          findUnique: vi.fn().mockResolvedValue({
            id: mockStationId,
            hostId: mockHostId,
          }),
        },
        liveSession: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "new-session",
            stationId: mockStationId,
            status: LiveSessionStatus.PREPARING,
            liveTitle: "My Session",
            queueRevision: 0,
          }),
        },
      };

      const mockEventService = { emit: vi.fn() } as any;

      const mockService = new LiveSessionsService(prismaMock as any, {} as any, mockEventService);

      const result = await mockService.createLiveSession(mockHostId, {
        stationId: mockStationId,
        liveTitle: "My Session",
        primaryStreamingPlatform: StreamingPlatform.TWITCH,
        savedProfileUrlSnapshot: "http://twitch.tv/myprofile",
      });

      expect(result.id).toBe("new-session");
      expect(prismaMock.liveSession.create).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user is not a host", async () => {
      const prismaMock = {
        $transaction: vi.fn(async (cb) => cb(prismaMock)),
        $queryRaw: vi.fn().mockImplementation((query) => {
          return [];
        }),
      };

      const mockEventService = { emit: vi.fn() } as any;
      const mockService = new LiveSessionsService(prismaMock as any, {} as any, mockEventService);

      await expect(
        mockService.createLiveSession(generateUuidV7(), {
          stationId: generateUuidV7(),
          liveTitle: "My Session",
          primaryStreamingPlatform: StreamingPlatform.TWITCH,
          savedProfileUrlSnapshot: "http://twitch.tv/myprofile",
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
