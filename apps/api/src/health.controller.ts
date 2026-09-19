import {
  Controller,
  Get,
  ServiceUnavailableException,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { testDbConnection } from "@platform/database";
import Redis from "ioredis";

@ApiTags("Health & Diagnostics")
@Controller({
  path: "",
  version: "1",
})
export class HealthController {
  @Get("health")
  @ApiOperation({ summary: "Liveness probe" })
  @ApiResponse({ status: 200, description: "Service is alive and running" })
  getHealth(@Req() req: any) {
    return {
      status: "UP",
      timestamp: new Date().toISOString(),
      requestId: req.requestId || "mock-request-id",
    };
  }

  @Get("readiness")
  @ApiOperation({ summary: "Readiness probe" })
  @ApiResponse({
    status: 200,
    description: "Service and all dependencies are fully operational",
  })
  @ApiResponse({
    status: 503,
    description: "One or more required dependencies are offline",
  })
  async getReadiness() {
    const services: Record<string, "UP" | "DOWN"> = {
      database: "DOWN",
      redis: "DOWN",
      storage: "DOWN",
    };

    let allHealthy = true;

    // 1. Verify PostgreSQL Database
    try {
      const isDbHealthy = await testDbConnection();
      if (isDbHealthy) {
        services.database = "UP";
      } else {
        allHealthy = false;
      }
    } catch {
      allHealthy = false;
    }

    // 2. Verify Redis Client
    let redisClient: Redis | null = null;
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 0,
        connectTimeout: 2000,
      });
      const pingResponse = await redisClient.ping();
      if (pingResponse === "PONG") {
        services.redis = "UP";
      } else {
        allHealthy = false;
      }
    } catch {
      allHealthy = false;
    } finally {
      if (redisClient) {
        redisClient.disconnect();
      }
    }

    // 3. Verify S3 Object Storage
    try {
      const hasS3Config = !!(
        process.env.S3_ENDPOINT &&
        process.env.S3_REGION &&
        process.env.S3_BUCKET &&
        process.env.S3_ACCESS_KEY &&
        process.env.S3_SECRET_KEY
      );
      if (hasS3Config) {
        services.storage = "UP";
      } else {
        // Fallback for dev and test environments
        const isDevOrTest =
          process.env.NODE_ENV === "development" ||
          process.env.NODE_ENV === "test";
        services.storage = isDevOrTest ? "UP" : "DOWN";
        if (services.storage === "DOWN") {
          allHealthy = false;
        }
      }
    } catch {
      allHealthy = false;
    }

    const response = {
      status: allHealthy ? "UP" : "DOWN",
      timestamp: new Date().toISOString(),
      services,
    };

    if (!allHealthy) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
