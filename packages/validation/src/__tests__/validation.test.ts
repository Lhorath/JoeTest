import { describe, it, expect } from "vitest";
import {
  validateApiEnv,
  validateWorkerEnv,
  validateWebServerEnv,
  devFixturesAllowed,
  hostSlugSchema,
} from "../index";

describe("Central Zod Environment Validation", () => {
  const validApiEnv = {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://postgres:secret@localhost:5432/thequeue_dev",
    REDIS_URL: "redis://localhost:6379",
    S3_ENDPOINT: "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_BUCKET: "thequeue-media-local",
    S3_ACCESS_KEY: "admin",
    S3_SECRET_KEY: "secret123",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    SMTP_FROM: "noreply@thequeue.com",
    STRIPE_SECRET_KEY: "TEST_STRIPE_KEY_PLACEHOLDER",
    STRIPE_WEBHOOK_SECRET: "whsec_key",
    PORT: "4000",
    CORS_ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:3001",
    SESSION_SECRET: "session_secret_rotation_key_32_characters_long",
    ENCRYPTION_SECRET: "encryption_secret_field_key_32_characters_long",
  };

  const validWorkerEnv = {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://postgres:secret@localhost:5432/thequeue_dev",
    REDIS_URL: "redis://localhost:6379",
    S3_ENDPOINT: "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_BUCKET: "thequeue-media-local",
    S3_ACCESS_KEY: "admin",
    S3_SECRET_KEY: "secret123",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    SMTP_FROM: "noreply@thequeue.com",
    WORKER_PORT: "4001",
    WORKER_CONCURRENCY: "10",
  };

  describe("validateApiEnv", () => {
    it("should pass and return parsed configuration when valid", () => {
      const config = validateApiEnv(validApiEnv);
      expect(config.PORT).toBe(4000);
      expect(config.NODE_ENV).toBe("development");
      expect(config.DATABASE_URL).toContain("postgresql://");
    });

    it("should throw an error if critical secrets are under length requirements", () => {
      const invalidEnv = {
        ...validApiEnv,
        SESSION_SECRET: "short_key", // Too short, fails minimum length 32 requirement
      };
      expect(() => validateApiEnv(invalidEnv)).toThrow();
    });

    it("should throw an error if database connection URL is malformed", () => {
      const invalidEnv = {
        ...validApiEnv,
        DATABASE_URL: "invalid-url",
      };
      expect(() => validateApiEnv(invalidEnv)).toThrow();
    });
  });

  describe("validateWorkerEnv", () => {
    it("should parse and coerce variables successfully", () => {
      const config = validateWorkerEnv(validWorkerEnv);
      expect(config.WORKER_CONCURRENCY).toBe(10);
      expect(config.WORKER_PORT).toBe(4001);
    });

    it("should fail if Redis connection URL is missing", () => {
      const { REDIS_URL, ...invalidEnv } = validWorkerEnv;
      expect(() => validateWorkerEnv(invalidEnv)).toThrow();
    });

    it("should reject sandbox hosts, test Stripe keys, and dev fixtures in production", () => {
      expect(() =>
        validateApiEnv({
          ...validApiEnv,
          NODE_ENV: "production",
          ENABLE_DEV_FIXTURES: "true",
        }),
      ).toThrow();

      expect(() =>
        validateWorkerEnv({
          ...validWorkerEnv,
          NODE_ENV: "production",
        }),
      ).toThrow();
    });

    it("should accept a non-local production worker configuration", () => {
      const config = validateWorkerEnv({
        ...validWorkerEnv,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://app:secret@postgres.internal:5432/thequeue",
        REDIS_URL: "redis://redis.internal:6379",
        S3_ENDPOINT: "https://accountid.r2.cloudflarestorage.com",
        S3_BUCKET: "thequeue-media",
        SMTP_HOST: "smtp.resend.com",
        SMTP_PORT: "465",
        SMTP_USER: "resend",
        SMTP_PASS: "re_live_secret",
        SMTP_FROM: "noreply@thequeue.live",
      });
      expect(config.NODE_ENV).toBe("production");
    });

    it("should reject a production web server that still uses sandbox settings", () => {
      expect(() =>
        validateWebServerEnv({
          ...validApiEnv,
          NODE_ENV: "production",
          NEXT_PUBLIC_APP_ENV: "production",
          NEXT_PUBLIC_WEB_URL: "https://thequeue.example",
          NEXT_PUBLIC_HOST_URL: "https://host.thequeue.example",
          NEXT_PUBLIC_ADMIN_URL: "https://admin.thequeue.example",
          NEXT_PUBLIC_API_URL: "https://api.thequeue.example",
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
          ADMIN_BOOTSTRAP_EMAIL: "admin@thequeue.example",
          ADMIN_BOOTSTRAP_USERNAME: "owner",
          ADMIN_BOOTSTRAP_PASSWORD: "a-long-bootstrap-password",
        }),
      ).toThrow();
    });
  });

  describe("devFixturesAllowed", () => {
    it("never allows fixtures in production", () => {
      expect(
        devFixturesAllowed({
          NODE_ENV: "production",
          ENABLE_DEV_FIXTURES: "true",
        }),
      ).toBe(false);
    });

    it("allows fixtures only when explicitly enabled outside production", () => {
      expect(devFixturesAllowed({ NODE_ENV: "development" })).toBe(false);
      expect(
        devFixturesAllowed({
          NODE_ENV: "development",
          ENABLE_DEV_FIXTURES: "true",
        }),
      ).toBe(true);
      expect(devFixturesAllowed({ NODE_ENV: "test" })).toBe(true);
    });
  });

  describe("hostSlugSchema", () => {
    it("should validate a correct non-reserved host slug", () => {
      const result = hostSlugSchema.safeParse("Emerald");
      expect(result.success).toBe(true);
      expect(result.data).toBe("Emerald");
    });

    it("should block host slugs matching reserved routes case-insensitively", () => {
      const resultAdminUpper = hostSlugSchema.safeParse("Admin");
      const resultApiLower = hostSlugSchema.safeParse("api");
      const resultRegisterMixed = hostSlugSchema.safeParse("rEgIsTeR");

      expect(resultAdminUpper.success).toBe(false);
      expect(resultApiLower.success).toBe(false);
      expect(resultRegisterMixed.success).toBe(false);
    });

    it("should block host slugs that contain invalid characters", () => {
      const resultInvalidChars = hostSlugSchema.safeParse("Emerald#123");
      expect(resultInvalidChars.success).toBe(false);
    });

    it("should block host slugs under minimum length requirements", () => {
      const resultTooShort = hostSlugSchema.safeParse("em");
      expect(resultTooShort.success).toBe(false);
    });
  });
});
