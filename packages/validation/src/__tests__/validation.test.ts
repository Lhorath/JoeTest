import { describe, it, expect } from "vitest";
import { validateApiEnv, validateWorkerEnv, hostSlugSchema } from "../index";

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
    NODE_ENV: "production",
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
