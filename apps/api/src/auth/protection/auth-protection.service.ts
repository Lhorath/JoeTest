import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@platform/database";
import Redis from "ioredis";

@Injectable()
export class AuthProtectionService {
  private readonly logger = new Logger(AuthProtectionService.name);
  private redisClient: Redis;
  private prisma: PrismaClient;

  // Tiers of lockout thresholds for authentication flows
  private readonly MAX_FAILED_ATTEMPTS_PER_EMAIL = 5;
  private readonly MAX_FAILED_ATTEMPTS_PER_IP = 20;
  private readonly LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes

  constructor(private configService: ConfigService) {
    const isTest = process.env.NODE_ENV === "test";
    const redisUrl =
      process.env[isTest ? "TEST_REDIS_URL" : "REDIS_URL"] ||
      "redis://localhost:6379";
    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1, // Don't hang forever if Redis is down
      enableOfflineQueue: false,
    });

    this.redisClient.on("error", (err) => {
      this.logger.error("Redis connection error in AuthProtectionService", err);
    });

    this.prisma = new PrismaClient();
  }

  /**
   * Called before a high-risk action (like login) to ensure the request is not locked out.
   */
  async verifyActionAllowed(email: string, ipAddress: string): Promise<void> {
    try {
      const emailLockKey = `auth:lockout:email:${email}`;
      const ipLockKey = `auth:lockout:ip:${ipAddress}`;

      const [isEmailLocked, isIpLocked] = await Promise.all([
        this.redisClient.get(emailLockKey),
        this.redisClient.get(ipLockKey),
      ]);

      if (isEmailLocked || isIpLocked) {
        this.logger.warn(
          `Auth action rejected (Lockout) - Email: ${email}, IP: ${ipAddress}`,
        );
        // Return generic 429 for security.
        throw new HttpException(
          "Too many attempts. Please try again later.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;

      // If Redis fails, we log it but fail safe (allow the request if we can't check lockout).
      // A more strict security posture would deny, but that risks a platform outage if Redis blips.
      this.logger.error(
        "Failed to check Redis lockout status. Failing safe (allowing).",
        error,
      );
    }
  }

  /**
   * Called after an authentication attempt to record the outcome and adjust counters.
   */
  async recordAttempt(
    email: string,
    ipAddress: string,
    userAgent: string | undefined,
    wasSuccessful: boolean,
    failureReason?: string,
  ): Promise<void> {
    // 1. Durably record the attempt in PostgreSQL
    try {
      const { generateUuidV7 } = await import("@platform/database");
      await this.prisma.authenticationAttempt.create({
        data: {
          id: generateUuidV7(),
          email,
          ipAddress,
          userAgent,
          wasSuccessful,
          failureReason,
        },
      });
    } catch (error) {
      this.logger.error(
        "Failed to persist AuthenticationAttempt to database",
        error,
      );
    }

    // 2. Adjust temporary lockouts in Redis
    try {
      if (wasSuccessful) {
        // Clear counters on success
        await Promise.all([
          this.redisClient.del(`auth:failed:email:${email}`),
          this.redisClient.del(`auth:failed:ip:${ipAddress}`),
        ]);
        return;
      }

      // Increment counters on failure
      const emailCounterKey = `auth:failed:email:${email}`;
      const ipCounterKey = `auth:failed:ip:${ipAddress}`;

      const [emailFails, ipFails] = await Promise.all([
        this.redisClient.incr(emailCounterKey),
        this.redisClient.incr(ipCounterKey),
      ]);

      // Set expiry on counters if it's the first increment
      if (emailFails === 1)
        await this.redisClient.expire(
          emailCounterKey,
          this.LOCKOUT_DURATION_SECONDS,
        );
      if (ipFails === 1)
        await this.redisClient.expire(
          ipCounterKey,
          this.LOCKOUT_DURATION_SECONDS,
        );

      // Trigger lockouts if thresholds exceeded
      const lockActions = [];
      if (emailFails >= this.MAX_FAILED_ATTEMPTS_PER_EMAIL) {
        this.logger.warn(`Triggering lockout for email: ${email}`);
        lockActions.push(
          this.redisClient.setex(
            `auth:lockout:email:${email}`,
            this.LOCKOUT_DURATION_SECONDS,
            "1",
          ),
        );
      }

      if (ipFails >= this.MAX_FAILED_ATTEMPTS_PER_IP) {
        this.logger.warn(`Triggering lockout for IP: ${ipAddress}`);
        lockActions.push(
          this.redisClient.setex(
            `auth:lockout:ip:${ipAddress}`,
            this.LOCKOUT_DURATION_SECONDS,
            "1",
          ),
        );
      }

      if (lockActions.length > 0) {
        await Promise.all(lockActions);
      }
    } catch (error) {
      this.logger.error("Failed to update Redis lockouts", error);
    }
  }

  // Graceful shutdown helper
  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
