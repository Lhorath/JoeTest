import { z } from "zod";

// ============================================================================
// 1. Core Environmental Schema Blueprints
// ============================================================================

const infrastructureSchema = {
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid connection URL"),
};

const s3Schema = {
  S3_ENDPOINT: z
    .string()
    .url("S3_ENDPOINT must be a valid S3 URL")
    .optional()
    .or(z.string().min(1)),
  S3_REGION: z.string().min(1, "S3_REGION is required"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
  S3_ACCESS_KEY: z.string().min(1, "S3_ACCESS_KEY is required"),
  S3_SECRET_KEY: z.string().min(1, "S3_SECRET_KEY is required"),
  S3_FORCE_PATH_STYLE: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(false),
};

const smtpSchema = {
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce
    .number()
    .int()
    .positive("SMTP_PORT must be a positive integer"),
  SMTP_USER: z.string().optional().or(z.literal("")),
  SMTP_PASS: z.string().optional().or(z.literal("")),
  SMTP_FROM: z.string().email("SMTP_FROM must be a valid email"),
};

const stripeSchema = {
  STRIPE_PUBLIC_KEY: z
    .string()
    .min(1, "STRIPE_PUBLIC_KEY is required")
    .optional(),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
};

const publicUrlsSchema = {
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_WEB_URL: z.string().url("NEXT_PUBLIC_WEB_URL is required"),
  NEXT_PUBLIC_HOST_URL: z.string().url("NEXT_PUBLIC_HOST_URL is required"),
  NEXT_PUBLIC_ADMIN_URL: z.string().url("NEXT_PUBLIC_ADMIN_URL is required"),
  NEXT_PUBLIC_API_URL: z.string().url("NEXT_PUBLIC_API_URL is required"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required"),
};

// ============================================================================
// 2. Specialized Application-Specific Schemas
// ============================================================================

export const apiEnvSchema = z.object({
  ...infrastructureSchema,
  ...s3Schema,
  ...smtpSchema,
  ...stripeSchema,
  PORT: z.coerce.number().int().default(4000),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .min(1, "CORS_ALLOWED_ORIGINS list is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  ENCRYPTION_SECRET: z
    .string()
    .min(32, "ENCRYPTION_SECRET must be at least 32 characters"),
  ENABLE_SWAGGER: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(false),
});

export type ApiEnvConfig = z.infer<typeof apiEnvSchema>;

export const workerEnvSchema = z.object({
  NODE_ENV: infrastructureSchema.NODE_ENV,
  REDIS_URL: infrastructureSchema.REDIS_URL,
  ...s3Schema,
  ...smtpSchema,
  WORKER_PORT: z.coerce.number().int().default(4001),
  WORKER_CONCURRENCY: z.coerce.number().int().default(5),
});

export type WorkerEnvConfig = z.infer<typeof workerEnvSchema>;

export const frontendEnvSchema = z.object({
  NODE_ENV: infrastructureSchema.NODE_ENV,
  ...publicUrlsSchema,
});

export type FrontendEnvConfig = z.infer<typeof frontendEnvSchema>;

// Helpers to validate environment variables
export function validateApiEnv(config: Record<string, unknown>): ApiEnvConfig {
  const result = apiEnvSchema.safeParse(config);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join(".")}: ${err.message}`)
      .join("\n");
    console.error(
      "❌ Invalid API backend environment variables:\n" + errorDetails,
    );
    throw new Error("API Environment validation failed");
  }
  return result.data;
}

export function validateWorkerEnv(
  config: Record<string, unknown>,
): WorkerEnvConfig {
  const result = workerEnvSchema.safeParse(config);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join(".")}: ${err.message}`)
      .join("\n");
    console.error("❌ Invalid Worker environment variables:\n" + errorDetails);
    throw new Error("Worker Environment validation failed");
  }
  return result.data;
}

export function validateFrontendEnv(
  config: Record<string, unknown>,
): FrontendEnvConfig {
  const result = frontendEnvSchema.safeParse(config);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join(".")}: ${err.message}`)
      .join("\n");
    console.error(
      "❌ Invalid Frontend environment variables:\n" + errorDetails,
    );
    throw new Error("Frontend Environment validation failed");
  }
  return result.data;
}

// ============================================================================
// 3. User & Auth Payloads Input Schemas
// ============================================================================

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username cannot exceed 30 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain alphanumeric characters, underscores, and hyphens",
  );

export const displayNameSchema = z
  .string()
  .min(2, "Display name must be at least 2 characters")
  .max(50, "Display name cannot exceed 50 characters");

export const baseSignUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
  passwordConfirmation: z.string().min(1, "Password confirmation is required"),
  acceptTerms: z
    .boolean({
      required_error: "You must accept the Terms of Service to create an account",
      invalid_type_error: "Terms acceptance must be a boolean",
    })
    .refine((val) => val === true, {
      message: "You must accept the Terms of Service and acknowledge the Privacy Policy to create an account",
    }),
  termsVersion: z.string().optional(),
});

export const signUpSchema = baseSignUpSchema.refine(
  (data) => data.password === data.passwordConfirmation,
  {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  },
);

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): boolean {
  return (
    typeof password === "string" &&
    typeof confirmation === "string" &&
    password.length > 0 &&
    password === confirmation
  );
}

export type SignUpInput = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    passwordConfirmation: z
      .string()
      .min(1, "Password confirmation is required")
      .optional(),
  })
  .refine(
    (data) =>
      !data.passwordConfirmation ||
      data.password === data.passwordConfirmation,
    {
      message: "Passwords do not match",
      path: ["passwordConfirmation"],
    },
  );

export type PasswordResetConfirmInput = z.infer<
  typeof passwordResetConfirmSchema
>;

export const emailVerificationConfirmSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export type EmailVerificationConfirmInput = z.infer<
  typeof emailVerificationConfirmSchema
>;

export const adminInvitationAcceptSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  email: z.string().email("Invalid email address").optional(),
  username: usernameSchema.optional(),
  displayName: displayNameSchema.optional(),
  password: passwordSchema.optional(),
});

export type AdminInvitationAcceptInput = z.infer<
  typeof adminInvitationAcceptSchema
>;

// ============================================================================
// 4. Centralized Production Database-Facing Input Schemas
// ============================================================================

// A. UUID Validation Schema
export const uuidSchema = z.string().uuid("Must be a valid UUID");

// B. Currency Constraints (USD only initial release)
export const currencySchema = z.literal("USD", {
  errorMap: () => ({
    message: "Currency must strictly be USD for the initial release",
  }),
});

// C. Monetary Minor Units Validation (Integer cents >= 0)
export const monetaryCentsSchema = z
  .number()
  .int("Monetary amounts must be represented as integer cents")
  .nonnegative("Monetary amounts cannot be negative");

// D. Streaming Platform Identifiers Validation
export const streamingPlatformSchema = z.enum([
  "KICK",
  "YOUTUBE",
  "TIKTOK",
  "FACEBOOK",
  "TWITCH",
]);

// E. External Social Profile Profile URL Validation
export const externalSocialUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .regex(
    /^(https?:\/\/)?(www\.)?(twitch\.tv|youtube\.com|youtu\.be|tiktok\.com|kick\.com|facebook\.com)\/.+/i,
    "URL must match one of the supported streaming platforms profile syntax",
  );

// F. Artist & Track Metadata Schema
export function normalizeSpotifyUrl(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export const spotifyUrlSchema = z
  .string()
  .trim()
  .transform((val) => normalizeSpotifyUrl(val))
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const parsed = new URL(val);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          return false;
        }
        const hostname = parsed.hostname.toLowerCase();
        const isApprovedDomain =
          hostname === "open.spotify.com" ||
          hostname === "spotify.com" ||
          hostname === "spotify.link" ||
          hostname.endsWith(".spotify.com");
        if (!isApprovedDomain) return false;
        if (
          parsed.pathname.toLowerCase().includes("javascript:") ||
          parsed.pathname.toLowerCase().includes("data:")
        ) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        "Must be a valid Spotify profile or artist URL (e.g. https://open.spotify.com/artist/...)",
    },
  );

export const optionalSpotifyUrlSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) =>
    val && val.trim().length > 0 ? normalizeSpotifyUrl(val) : null,
  )
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const parsed = new URL(val);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          return false;
        }
        const hostname = parsed.hostname.toLowerCase();
        const isApprovedDomain =
          hostname === "open.spotify.com" ||
          hostname === "spotify.com" ||
          hostname === "spotify.link" ||
          hostname.endsWith(".spotify.com");
        if (!isApprovedDomain) return false;
        if (
          parsed.pathname.toLowerCase().includes("javascript:") ||
          parsed.pathname.toLowerCase().includes("data:")
        ) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        "Must be a valid Spotify profile or artist URL (e.g. https://open.spotify.com/artist/...)",
    },
  );

export const createArtistIdentitySchema = z.object({
  artistName: z
    .string()
    .min(1, "Artist name cannot be blank")
    .max(100, "Artist name cannot exceed 100 characters")
    .transform((val) => val.trim()),
  spotifyUrl: optionalSpotifyUrlSchema,
  biography: z.string().max(1000).optional().nullable(),
  profileImageKey: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

export type CreateArtistIdentityInput = z.infer<
  typeof createArtistIdentitySchema
>;

export const updateArtistIdentitySchema = z.object({
  artistName: z
    .string()
    .min(1, "Artist name cannot be blank")
    .max(100, "Artist name cannot exceed 100 characters")
    .transform((val) => val.trim())
    .optional(),
  spotifyUrl: optionalSpotifyUrlSchema,
  biography: z.string().max(1000).optional().nullable(),
  profileImageKey: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export type UpdateArtistIdentityInput = z.infer<
  typeof updateArtistIdentitySchema
>;

export const artistNameSchema = z
  .string()
  .min(1, "Artist name cannot be blank")
  .max(100, "Artist name cannot exceed 100 characters")
  .transform((val) => val.trim());

export const songNameSchema = z
  .string()
  .min(1, "Song name cannot be blank")
  .max(150, "Song name cannot exceed 150 characters")
  .transform((val) => val.trim());

// G. Priority Tier Validation Schema
export const priorityTierInputSchema = z.object({
  name: z.string().min(1, "Tier name is required").max(50),
  description: z.string().max(200).optional(),
  priceCents: monetaryCentsSchema.refine((val) => val >= 200, {
    message:
      "Price cannot be lower than the platform price floor of $2.00 USD (200 cents)",
  }),
  currency: currencySchema,
  priorityRank: z
    .number()
    .int()
    .positive("Priority rank must be a positive integer"),
});

// H. Queue Limits Configuration Schema
export const queueLimitsSchema = z.object({
  maxFreeSubmissionsPerUser: z
    .number()
    .int()
    .positive("Limits must be positive integers")
    .default(1),
  maxQueueSize: z
    .number()
    .int()
    .positive("Max queue size must be a positive integer")
    .default(100),
  totalFreeCapacityLimit: z.number().int().positive().optional(),
});

// I. Commission Split Percentage Schema (Validation sums to 100%)
export const commissionSplitSchema = z
  .object({
    hostPercentage: z.number().min(0).max(100),
    platformPercentage: z.number().min(0).max(100),
  })
  .refine((data) => data.hostPercentage + data.platformPercentage === 100, {
    message:
      "The split host percentage and platform percentage must sum to exactly 100%",
  });

// J. Pagination Parameters Validation
export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// K. Queue History and Batch Validation Schemas
export const queueBatchOperationTypeSchema = z.enum([
  "MOVE_TO_HISTORY",
  "REINSERT_TO_QUEUE",
  "REMOVE_FROM_ACTIVE_QUEUE",
]);

export const queueBatchOperationSchema = z.object({
  liveSessionId: uuidSchema,
  stationId: uuidSchema,
  hostUserId: uuidSchema,
  operationType: queueBatchOperationTypeSchema,
  reason: z.string().optional(),
  selectedEntryCount: z
    .number()
    .int()
    .positive("Must select at least one entry"),
  requestId: z.string().optional(),
  correlationId: z.string().optional(),
});

export type QueueBatchOperationInput = z.infer<
  typeof queueBatchOperationSchema
>;

export const queueEventSchema = z.object({
  queueEntryId: uuidSchema,
  liveSessionId: uuidSchema,
  actingUserId: uuidSchema.optional().nullable(),
  eventType: z.string().min(1, "Event type is required"),
  previousState: z.string().optional().nullable(),
  newState: z.string().min(1, "New state is required"),
  previousPosition: z.number().int().optional().nullable(),
  newPosition: z.number().int().optional().nullable(),
  reason: z.string().optional().nullable(),
  batchOperationId: uuidSchema.optional().nullable(),
  requestId: z.string().optional().nullable(),
  correlationId: z.string().optional().nullable(),
});

export type QueueEventInput = z.infer<typeof queueEventSchema>;

// L. Centralized Reserved Host Slugs & Route Protection
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "host",
  "hosts",
  "login",
  "register",
  "account",
  "settings",
  "legal",
  "privacy",
  "terms",
  "support",
  "about",
  "live",
  "stations",
  "music",
  "queue",
  "uploads",
  "library",
  "submissions",
  "session",
  "auth",
  "theme",
  "profile",
  "artist",
  "overlay",
  "apply-host",
  "onboarding",
  "become-host",
  "verify-email",
  "forgot-password",
  "reset-password",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
] as const;

export function slugifyHostname(name: string): string {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || "station";
}

export const hostSlugSchema = z
  .string()
  .min(3, "Host slug must be at least 3 characters")
  .max(50, "Host slug cannot exceed 50 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Host slug can only contain alphanumeric characters, underscores, and hyphens",
  )
  .refine(
    (val) => {
      const normalized = val.toLowerCase().trim();
      return !RESERVED_SLUGS.includes(normalized as any);
    },
    {
      message: "This slug matches a reserved system route and cannot be used",
    },
  );

// ============================================================================
// M. User Profile & Account Settings Validation
// ============================================================================

export const updateUserProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal("")),
  bannerUrl: z.string().url().optional().nullable().or(z.literal("")),
  country: z.string().max(100).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable().or(z.literal("")),
  spotifyProfileUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export const updateTrackSchema = z.object({
  songName: z.string().min(1).max(200).optional(),
  albumName: z.string().max(200).optional().nullable(),
  explicitContent: z.boolean().optional(),
  bpm: z.number().int().min(20).max(300).optional().nullable(),
  musicalKey: z.string().max(10).optional().nullable(),
  isPublic: z.boolean().optional(),
});

export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================================================
// N. Global Site Customization & Branding Validation
// ============================================================================

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const hexColorSchema = z
  .string()
  .regex(hexColorRegex, "Must be a valid hex color code (e.g. #8B5CF6)");

export const updateCustomizationSchema = z.object({
  siteName: z.string().min(1, "Site name is required").max(100).optional(),
  primaryLogoUrl: z.string().url().optional().nullable().or(z.literal("")),
  alternateLogoUrl: z.string().url().optional().nullable().or(z.literal("")),
  faviconUrl: z.string().url().optional().nullable().or(z.literal("")),
  tokens: z.record(z.string()).optional(),
  primaryColor: hexColorSchema.optional(),
  primaryHoverColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  backgroundColor: hexColorSchema.optional(),
  surfaceColor: hexColorSchema.optional(),
  textColor: hexColorSchema.optional(),
  mutedTextColor: hexColorSchema.optional(),
  borderColor: hexColorSchema.optional(),
  liveColor: hexColorSchema.optional(),
  successColor: hexColorSchema.optional(),
  warningColor: hexColorSchema.optional(),
  dangerColor: hexColorSchema.optional(),
  customCss: z.string().max(10000).optional().nullable(),
});

export type UpdateCustomizationInput = z.infer<
  typeof updateCustomizationSchema
>;

// ============================================================================
// O. Host Application, Station & Platform Settings Validation
// ============================================================================

export const createHostApplicationSchema = z.object({
  publicHostName: z
    .string()
    .min(2, "Public host name must be at least 2 characters")
    .max(50, "Public host name cannot exceed 50 characters"),
  primaryStreamingPlatform: z.enum([
    "KICK",
    "YOUTUBE",
    "TIKTOK",
    "FACEBOOK",
    "TWITCH",
  ]),
  primaryStreamingProfileUrl: z
    .string()
    .url("Must be a valid profile or channel URL"),
  country: z.string().min(2, "Country is required").max(100),
  biography: z.string().max(1000).optional(),
  acceptedGenres: z.string().max(300).optional(),
  exampleLivestreamLinks: z.string().max(500).optional(),
  acceptHostTerms: z
    .boolean({
      required_error: "You must accept the Host Terms and Broadcast Responsibility rules",
      invalid_type_error: "Host Terms acceptance must be a boolean",
    })
    .refine((val) => val === true, {
      message: "You must accept the Host Terms and Broadcast Responsibility rules",
    }),
  termsVersion: z.string().optional(),
});

export type CreateHostApplicationInput = z.infer<
  typeof createHostApplicationSchema
>;

// ============================================================================
// P. Legal Acceptance Validation
// ============================================================================

export const recordLegalAcceptanceSchema = z.object({
  documentSlug: z.string().min(1).default("terms"),
  version: z.string().min(1, "Terms version string is required"),
  acceptanceSource: z.enum([
    "SIGNUP",
    "HOST_APPLICATION",
    "HOST_GO_LIVE",
    "TERMS_UPDATE",
    "STATION_ACTIVATION",
  ]),
});

export type RecordLegalAcceptanceInput = z.infer<
  typeof recordLegalAcceptanceSchema
>;


export const updateStationSchema = z.object({
  description: z.string().max(1000).optional().nullable(),
  primaryStreamingPlatform: z
    .enum(["KICK", "YOUTUBE", "TIKTOK", "FACEBOOK", "TWITCH"])
    .optional(),
  streamUrl: z.string().url().optional().nullable().or(z.literal("")),
  acceptedContentRules: z.string().max(1000).optional().nullable(),
  explicitContentAllowed: z.boolean().optional(),
  maxTrackDurationSeconds: z.number().int().min(30).max(1800).optional(),
  maxQueueSize: z.number().int().min(1).max(200).optional(),
});

export type UpdateStationInput = z.infer<typeof updateStationSchema>;

export const goLiveSchema = z.object({
  liveTitle: z
    .string()
    .min(3, "Broadcast title must be at least 3 characters")
    .max(120, "Broadcast title cannot exceed 120 characters"),
  primaryStreamingPlatform: z.enum([
    "KICK",
    "YOUTUBE",
    "TIKTOK",
    "FACEBOOK",
    "TWITCH",
  ]),
  streamUrl: z.string().url().optional().nullable().or(z.literal("")),
  submissionsOpen: z.boolean().optional().default(true),
  freeLineOpen: z.boolean().optional().default(true),
  paidSubmissionsOpen: z.boolean().optional().default(true),
});

export type GoLiveInput = z.infer<typeof goLiveSchema>;

export const updatePlatformSettingsSchema = z.object({
  requireManualHostApproval: z.boolean(),
});

export type UpdatePlatformSettingsInput = z.infer<
  typeof updatePlatformSettingsSchema
>;

// ============================================================================
// Spotify URL & Media Validation
// ============================================================================

export function validateSpotifyUrl(url?: string | null): { valid: boolean; error?: string } {
  if (!url || url.trim() === "") return { valid: true };
  const trimmed = url.trim();

  // Reject dangerous schemes immediately
  if (
    trimmed.toLowerCase().startsWith("javascript:") ||
    trimmed.toLowerCase().startsWith("data:") ||
    trimmed.toLowerCase().startsWith("vbscript:")
  ) {
    return {
      valid: false,
      error: "Invalid URL scheme.",
    };
  }

  // Support spotify: URI format
  if (/^spotify:(artist|user|track|album|playlist):[a-zA-Z0-9]+$/i.test(trimmed)) {
    return { valid: true };
  }

  // Support Web URLs
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.toLowerCase();
    const isApprovedDomain =
      hostname === "open.spotify.com" ||
      hostname === "spotify.com" ||
      hostname === "spotify.link" ||
      hostname.endsWith(".spotify.com");

    if (!isApprovedDomain) {
      return {
        valid: false,
        error: "URL must be a Spotify link (e.g. https://open.spotify.com/artist/...)",
      };
    }

    if (
      parsed.pathname.toLowerCase().includes("javascript:") ||
      parsed.pathname.toLowerCase().includes("data:")
    ) {
      return {
        valid: false,
        error: "Invalid Spotify URL.",
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: "Please enter a valid Spotify URL (e.g. https://open.spotify.com/artist/...)",
    };
  }
}

// ============================================================================
// Submission Validation Schema
// ============================================================================

export const createSubmissionSchema = z.object({
  sourceTrackId: z.string().min(1, "Track ID is required"),
  artistIdentityId: z.string().nullable().optional(),
  tierSnapshotId: z.string().optional().nullable(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

// ============================================================================
// Station Priority Tier Schemas
// ============================================================================

export const createStationPriorityTierSchema = z.object({
  name: z.string().min(1, "Tier name is required").max(50),
  description: z.string().max(300).optional().nullable(),
  priceCents: z.number().int().min(50, "Price must be at least $0.50").max(100000),
  priorityRank: z.number().int().min(1).max(100),
  colorSlot: z.string().min(1),
  isActive: z.boolean().optional().default(true),
  isUpgradeEnabled: z.boolean().optional().default(true),
});

export type CreateStationPriorityTierInput = z.infer<
  typeof createStationPriorityTierSchema
>;

export const updateStationPriorityTierSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(300).optional().nullable(),
  priceCents: z.number().int().min(50).max(100000).optional(),
  priorityRank: z.number().int().min(1).max(100).optional(),
  colorSlot: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isUpgradeEnabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type UpdateStationPriorityTierInput = z.infer<
  typeof updateStationPriorityTierSchema
>;

export const reorderStationPriorityTiersSchema = z.object({
  tierIds: z.array(z.string().min(1)).min(1, "At least one tier ID is required"),
});

export type ReorderStationPriorityTiersInput = z.infer<
  typeof reorderStationPriorityTiersSchema
>;

// ============================================================================
// Operational Admin Validation Schemas
// ============================================================================

export const adminSubmissionFilterSchema = z.object({
  search: z.string().optional(),
  submissionId: z.string().optional(),
  username: z.string().optional(),
  artistName: z.string().optional(),
  songName: z.string().optional(),
  stationId: z.string().optional(),
  hostId: z.string().optional(),
  liveSessionId: z.string().optional(),
  paymentStatus: z.string().optional(),
  queueStatus: z.string().optional(),
  isPriority: z
    .preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    }, z.boolean().optional()),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminSubmissionFilterInput = z.infer<
  typeof adminSubmissionFilterSchema
>;

export const adminSubmissionActionSchema = z.object({
  action: z.enum(["REMOVE", "RESTRICT", "INVESTIGATE_FLAG"]),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
  adminNotes: z.string().max(1000).optional(),
});

export type AdminSubmissionActionInput = z.infer<
  typeof adminSubmissionActionSchema
>;

export const adminUserFilterSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  accountStatus: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminUserFilterInput = z.infer<typeof adminUserFilterSchema>;

export const adminUserActionSchema = z.object({
  action: z.enum(["SUSPEND", "UNSUSPEND", "REVOKE_SESSIONS"]),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
});

export type AdminUserActionInput = z.infer<typeof adminUserActionSchema>;

export const adminCompensatingLedgerSchema = z.object({
  paymentId: z.string().optional(),
  submissionId: z.string().optional(),
  description: z.string().min(5, "Description must be at least 5 characters").max(300),
  hostAmountCents: z.number().int(),
  platformAmountCents: z.number().int(),
  reason: z.string().min(5, "Reason is required for auditing compensating entries").max(500),
});

export type AdminCompensatingLedgerInput = z.infer<
  typeof adminCompensatingLedgerSchema
>;

export const adminPaymentFilterSchema = z.object({
  search: z.string().optional(),
  submissionId: z.string().optional(),
  status: z.string().optional(),
  payingUserId: z.string().optional(),
  hostId: z.string().optional(),
  stationId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminPaymentFilterInput = z.infer<typeof adminPaymentFilterSchema>;

export const adminRepairSchema = z.object({
  discrepancyType: z.string().min(1),
  targetId: z.string().min(1),
  reason: z.string().min(3, "Audit reason is required").max(500),
});

export type AdminRepairInput = z.infer<typeof adminRepairSchema>;

export const adminAuditLogFilterSchema = z.object({
  search: z.string().optional(),
  actingAdminUserId: z.string().optional(),
  actionType: z.string().optional(),
  targetEntityType: z.string().optional(),
  targetEntityId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminAuditLogFilterInput = z.infer<
  typeof adminAuditLogFilterSchema
>;

export const adminMediaFilterSchema = z.object({
  search: z.string().optional(),
  ownerUserId: z.string().optional(),
  storageStatus: z.string().optional(),
  isPlayed: z
    .preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    }, z.boolean().optional()),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminMediaFilterInput = z.infer<typeof adminMediaFilterSchema>;

export const adminStationSettingsSchema = z.object({
  submissionsEnabled: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
});

export type AdminStationSettingsInput = z.infer<
  typeof adminStationSettingsSchema
>;

