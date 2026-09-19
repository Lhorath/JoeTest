import { describe, it, expect } from "vitest";
import {
  TERMS_METADATA,
  PRIVACY_METADATA,
  getLegalConfig,
} from "@platform/config";
import {
  signUpSchema,
  createHostApplicationSchema,
  recordLegalAcceptanceSchema,
} from "../index";

describe("Legal Workflows & Enforcement Test Suite", () => {
  describe("Registration Flow Legal Enforcement", () => {
    it("should allow registration with explicit terms acceptance and active version", () => {
      const payload = {
        email: "producer@domain.com",
        username: "prod_king",
        displayName: "Prod King",
        password: "SuperPassword123!",
        passwordConfirmation: "SuperPassword123!",
        acceptTerms: true,
        termsVersion: TERMS_METADATA.version,
      };

      const parsed = signUpSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it("should strictly reject registration when terms acceptance is false", () => {
      const payload = {
        email: "producer@domain.com",
        username: "prod_king",
        displayName: "Prod King",
        password: "SuperPassword123!",
        passwordConfirmation: "SuperPassword123!",
        acceptTerms: false,
      };

      const parsed = signUpSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.errors.some((e) => e.path.includes("acceptTerms"))).toBe(true);
      }
    });

    it("should strictly reject registration when terms acceptance is undefined or missing", () => {
      const payload = {
        email: "producer@domain.com",
        username: "prod_king",
        displayName: "Prod King",
        password: "SuperPassword123!",
        passwordConfirmation: "SuperPassword123!",
      };

      const parsed = signUpSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe("Host Application Flow Legal Enforcement", () => {
    it("should allow host application with explicit acceptHostTerms: true", () => {
      const payload = {
        publicHostName: "Station Host Alpha",
        primaryStreamingPlatform: "TWITCH" as const,
        primaryStreamingProfileUrl: "https://twitch.tv/stationhost",
        country: "Canada",
        biography: "Full time streamer",
        acceptHostTerms: true,
        termsVersion: TERMS_METADATA.version,
      };

      const parsed = createHostApplicationSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it("should reject host application when acceptHostTerms is omitted", () => {
      const payload = {
        publicHostName: "Station Host Alpha",
        primaryStreamingPlatform: "TWITCH" as const,
        primaryStreamingProfileUrl: "https://twitch.tv/stationhost",
        country: "Canada",
        biography: "Full time streamer",
      };

      const parsed = createHostApplicationSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.errors.some((e) => e.path.includes("acceptHostTerms"))).toBe(true);
      }
    });

    it("should reject host application when acceptHostTerms is false", () => {
      const payload = {
        publicHostName: "Station Host Alpha",
        primaryStreamingPlatform: "TWITCH" as const,
        primaryStreamingProfileUrl: "https://twitch.tv/stationhost",
        country: "Canada",
        acceptHostTerms: false,
      };

      const parsed = createHostApplicationSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });
  });

  describe("Legal Status & Acceptance Requirements", () => {
    it("should verify legal configuration and published version strings", () => {
      const config = getLegalConfig();
      expect(config.entityName).toBeDefined();
      expect(config.legalEmail).toBeDefined();
      expect(config.copyrightEmail).toBeDefined();
      expect(config.governingJurisdiction).toBeDefined();

      expect(TERMS_METADATA.version).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
      expect(PRIVACY_METADATA.version).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    });

    it("should validate legal acceptance payloads against supported sources", () => {
      const validSources = [
        "SIGNUP",
        "HOST_APPLICATION",
        "HOST_GO_LIVE",
        "TERMS_UPDATE",
        "STATION_ACTIVATION",
      ] as const;

      for (const source of validSources) {
        const parsed = recordLegalAcceptanceSchema.safeParse({
          documentSlug: "terms",
          version: TERMS_METADATA.version,
          acceptanceSource: source,
        });
        expect(parsed.success).toBe(true);
      }
    });

    it("should reject acceptance payloads with invalid document slugs", () => {
      const parsed = recordLegalAcceptanceSchema.safeParse({
        documentSlug: "",
        version: TERMS_METADATA.version,
        acceptanceSource: "SIGNUP",
      });
      expect(parsed.success).toBe(false);
    });
  });
});
