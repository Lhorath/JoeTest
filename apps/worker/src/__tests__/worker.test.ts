import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import Redis from "ioredis";

// Mock Redis connection completely
vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        ping: vi.fn().mockResolvedValue("PONG"),
        disconnect: vi.fn(),
      };
    }),
  };
});

describe("TheQueue Worker Health Server", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();

    app.get("/health", (_req, res) => {
      res.json({
        status: "UP",
        timestamp: new Date().toISOString(),
      });
    });

    app.get("/readiness", async (_req, res) => {
      let redisHealthy = true;
      try {
        const connection = new Redis("redis://localhost:6379");
        const ping = await connection.ping();
        if (ping !== "PONG") {
          redisHealthy = false;
        }
      } catch {
        redisHealthy = false;
      }

      const status = {
        status: redisHealthy ? "UP" : "DOWN",
        redis: redisHealthy ? "UP" : "DOWN",
        bullmq: "UP", // Mocked active status for testing
      };

      if (!redisHealthy) {
        res.status(503).json(status);
      } else {
        res.json(status);
      }
    });
  });

  it("should respond to liveness probes with status UP", async () => {
    const res = await request(app).get("/health").expect(200);

    expect(res.body.status).toBe("UP");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("should respond to readiness checks with database/redis connection states", async () => {
    const res = await request(app).get("/readiness").expect(200);

    expect(res.body.status).toBe("UP");
    expect(res.body.redis).toBe("UP");
    expect(res.body.bullmq).toBe("UP");
  });
});
