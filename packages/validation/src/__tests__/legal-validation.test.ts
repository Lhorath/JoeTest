import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  createHostApplicationSchema,
  recordLegalAcceptanceSchema,
} from "../index";

describe("Legal Validation Suite", () => {
  describe("A. Registration Terms Acceptance", () => {
    const baseSignUpData = {
      email: "artist@example.com",
      username: "indie_artist",
      displayName: "Indie Artist",
      password: "SecurePassword123!",
      passwordConfirmation: "SecurePassword123!",
    };

    it("should accept valid Terms acceptance (acceptTerms === true)", () => {
      const result = signUpSchema.safeParse({
        ...baseSignUpData,
        acceptTerms: true,
        termsVersion: "2026-08-25.1",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing Terms acceptance", () => {
      const result = signUpSchema.safeParse({
        ...baseSignUpData,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) => e.path.includes("acceptTerms"));
        expect(error).toBeDefined();
      }
    });

    it("should reject false Terms acceptance (acceptTerms === false)", () => {
      const result = signUpSchema.safeParse({
        ...baseSignUpData,
        acceptTerms: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) => e.path.includes("acceptTerms"));
        expect(error).toBeDefined();
        expect(error?.message).toContain("Terms of Service");
      }
    });

    it("should reject non-boolean Terms acceptance values", () => {
      const result = signUpSchema.safeParse({
        ...baseSignUpData,
        acceptTerms: "yes" as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("B. Host Terms Acceptance", () => {
    const baseHostApplicationData = {
      publicHostName: "DJ Premier Live",
      primaryStreamingPlatform: "TWITCH" as const,
      primaryStreamingProfileUrl: "https://twitch.tv/djpremier",
      country: "United States",
      biography: "Live music host broadcasting hip-hop reviews",
    };

    it("should accept true acceptHostTerms", () => {
      const result = createHostApplicationSchema.safeParse({
        ...baseHostApplicationData,
        acceptHostTerms: true,
        termsVersion: "2026-08-25.1",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing acceptHostTerms", () => {
      const result = createHostApplicationSchema.safeParse({
        ...baseHostApplicationData,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) => e.path.includes("acceptHostTerms"));
        expect(error).toBeDefined();
        expect(error?.message).toContain("Host Terms");
      }
    });

    it("should reject false acceptHostTerms", () => {
      const result = createHostApplicationSchema.safeParse({
        ...baseHostApplicationData,
        acceptHostTerms: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) => e.path.includes("acceptHostTerms"));
        expect(error).toBeDefined();
        expect(error?.message).toContain("Host Terms");
      }
    });

    it("should reject non-boolean acceptHostTerms", () => {
      const result = createHostApplicationSchema.safeParse({
        ...baseHostApplicationData,
        acceptHostTerms: "true" as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("C. Record Legal Acceptance Payload Validation", () => {
    it("should accept valid payload with recognized source", () => {
      const sources = [
        "SIGNUP",
        "HOST_APPLICATION",
        "HOST_GO_LIVE",
        "TERMS_UPDATE",
        "STATION_ACTIVATION",
      ] as const;

      for (const source of sources) {
        const result = recordLegalAcceptanceSchema.safeParse({
          documentSlug: "terms",
          version: "2026-08-25.1",
          acceptanceSource: source,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should default documentSlug to 'terms' when omitted", () => {
      const result = recordLegalAcceptanceSchema.safeParse({
        version: "2026-08-25.1",
        acceptanceSource: "SIGNUP",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.documentSlug).toBe("terms");
      }
    });

    it("should reject invalid or forged acceptance sources", () => {
      const result = recordLegalAcceptanceSchema.safeParse({
        documentSlug: "terms",
        version: "2026-08-25.1",
        acceptanceSource: "FORGED_SOURCE_ADMIN_BYPASS" as any,
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty version strings", () => {
      const result = recordLegalAcceptanceSchema.safeParse({
        documentSlug: "terms",
        version: "",
        acceptanceSource: "SIGNUP",
      });
      expect(result.success).toBe(false);
    });
  });
});
