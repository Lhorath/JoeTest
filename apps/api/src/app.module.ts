import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { createLogger } from "@platform/logger";
import { MailModule } from "./mail/mail.module";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import Redis from "ioredis";
import { AuthModule } from "./auth/auth.module";
import { StorageModule } from "./storage/storage.module";
import { TracksModule } from "./tracks/tracks.module";
import { AdminTracksModule } from "./admin/admin-tracks.module";
import { LiveSessionsModule } from "./live-sessions/live-sessions.module";
import { SubmissionsModule } from "./submissions/submissions.module";
import { BullModule } from "@nestjs/bullmq";

import { IdempotencyModule } from "./common/idempotency/idempotency.module";
import { PaymentsModule } from "./payments/payments.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl =
          config.get<string>("REDIS_URL") || "redis://localhost:6379";
        return {
          throttlers: [
            // Default rate limit: 100 requests per 60 seconds
            {
              ttl: 60,
              limit: 100,
            },
          ],
          // Store rate limits in Redis
          storage: new ThrottlerStorageRedisService(
            new Redis(redisUrl, { maxRetriesPerRequest: 1 }),
          ),
        };
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl =
          config.get<string>("REDIS_URL") || "redis://localhost:6379";
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port, 10),
          },
        };
      },
    }),
    MailModule,
    AuthModule,
    StorageModule,
    TracksModule,
    AdminTracksModule,
    LiveSessionsModule,
    SubmissionsModule,
    IdempotencyModule,

    PaymentsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const logger = createLogger("api");
    // Global request-response logging middleware
    consumer
      .apply((req: any, res: any, next: () => void) => {
        const start = Date.now();
        res.on("finish", () => {
          const duration = Date.now() - start;
          logger.info(
            `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
            {
              requestId: req.requestId,
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode,
              duration,
            },
          );
        });
        next();
      })
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
