import {
  LiveSessionStatus,
  StreamingPlatform,
  QueueStatus,
  ProcessingState,
  AccountStatus,
  Role,
  AdminPermission,
  HostApplicationStatus,
  StationStatus,
  PayoutProvider,
  PublicLiveSessionSummary,
  PublicLiveSessionDetail,
  PublicQueueEntry,
  UserSubmissionSummary,
  SubmissionEligibilityResponse,
  TrackSummary,
  CreateSubmissionDto,
  CreateSubmissionResponse,
  UpgradeSubmissionDto,
  UpgradeSubmissionResponse,
  CreateTrackUploadUrlDto,
  CreateUploadUrlResponse,
  ThemeTokens,
  PublicThemeConfig,
  AdminCustomizationConfig,
  UserProfile,
  PublicUserProfile,
  UserSessionInfo,
  SecurityEventLog,
  UserPreferencesDto,
  PlatformSettingsDto,
  HostApplicationSummary,
  HostProfileSummary,
  StationSummary,
  PublicStationDetail,
  LegalAcceptanceRecord,
  LegalAcceptanceSource,
  ArtistIdentity,
  ArtistIdentitySummary,
  CreateArtistIdentityDto,
  UpdateArtistIdentityDto,
  StationPriorityTier,
  CreateStationPriorityTierDto,
  UpdateStationPriorityTierDto,
  ReorderStationPriorityTiersDto,
  WeeklyTop3Response,
  WeeklyTop3Item,
  WeeklyTop3Period,
} from "@platform/types";
import { RESERVED_SLUGS, slugifyHostname } from "@platform/validation";
import {
  TERMS_METADATA,
  PRIVACY_METADATA,
  getLegalConfig,
  getCurrentWeeklyPeriod,
  NORMAL_PLAY_RATE_LIMIT_MS,
  QUALIFICATION_CONTINUOUS_PLAYBACK_MS,
} from "@platform/config";
import {
  persistLegalAcceptanceToDb,
  getDbLegalAcceptancesForUser,
  hasUserAcceptedCurrentVersionInDb,
} from "@platform/database";

export interface StoredUser extends UserProfile {
  passwordHash: string;
}

export interface StoredSessionToken {
  id: string;
  token: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface StoredSecurityLog extends SecurityEventLog {
  userId: string;
}

export interface StoredThemeCustomization extends AdminCustomizationConfig {}

export interface StoredHostApplication extends HostApplicationSummary {}

export interface StoredHostProfile extends HostProfileSummary {}

export interface StoredStation extends StationSummary {}

export interface StoredPayoutAccount {
  id: string;
  hostId: string;
  userId: string;
  provider: PayoutProvider;
  providerAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  isIdentityVerified: boolean;
  onboardingState: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession extends PublicLiveSessionDetail {
  endedAt?: string;
  lastPlaybackActivityAt?: string;
  tiers: {
    tierSnapshotId: string;
    name: string;
    priceCents: number;
    priorityRank: number;
    colorSlot: string;
    available: boolean;
  }[];
}

export interface StoredTrack extends TrackSummary {
  audioDataUrl?: string;
  originalFilename?: string;
  mimeType?: string;
  lastPlayedAt?: string;
}

export interface StoredArtistIdentity extends ArtistIdentity {
  id: string;
  userId: string;
  artistName: string;
  normalizedArtistName: string;
  spotifyUrl: string | null;
  biography: string | null;
  profileImageKey: string | null;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface StoredQueueEntry extends PublicQueueEntry {
  submissionId: string;
  submittingUserId: string;
  sourceTrackId: string;
  loadedIntoPlayerAt?: string | null;
  originPriorityRank?: number;
  originSortOrder?: number;
  completedAt?: string | null;
  skippedAt?: string | null;
  removedAt?: string | null;
  wasPlayed?: boolean;
  playbackCompleted?: boolean;
}

export interface StoredSubmission extends UserSubmissionSummary {
  submittingUserId: string;
  sourceTrackId: string;
  artistIdentityId?: string | null;
}

export interface StoredPasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface StoredEmailVerificationToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface StoredPlaybackEvent {
  id: string;
  liveSessionId: string;
  stationId: string;
  queueEntryId: string;
  submissionId: string;
  trackId: string;
  songName: string;
  artistName: string;
  isPriority: boolean;
  artistIdentityId?: string | null;
  spotifyUrl?: string | null;
  eventType: "QUALIFIED_PLAY" | "COMPLETE" | "PLAY" | "PAUSE" | "SEEK" | "STOP";
  timestamp: string;
}

// Global server state singleton for Next.js App Router
declare global {
  // eslint-disable-next-line no-var
  var __THE_QUEUE_STATE__:
    | {
        users: Map<string, StoredUser>;
        artistIdentities: Map<string, StoredArtistIdentity>;
        sessionTokens: Map<string, StoredSessionToken>;
        passwordResetTokens: Map<string, StoredPasswordResetToken>;
        emailVerificationTokens: Map<string, StoredEmailVerificationToken>;
        securityLogs: StoredSecurityLog[];
        userPreferences: Map<string, UserPreferencesDto>;
        themeCustomization: StoredThemeCustomization;
        platformSettings: {
          requireManualHostApproval: boolean;
          updatedAt: string;
          updatedByUserId: string | null;
        };
        hostApplications: Map<string, StoredHostApplication>;
        hostProfiles: Map<string, StoredHostProfile>;
        stations: Map<string, StoredStation>;
        payoutAccounts: Map<string, StoredPayoutAccount>;
        sessions: Map<string, StoredSession>;
        queues: Map<string, StoredQueueEntry[]>;
        tracks: Map<string, StoredTrack>;
        submissions: Map<string, StoredSubmission>;
        uploadIntents: Map<
          string,
          {
            trackId: string;
            intentId: string;
            metadata: CreateTrackUploadUrlDto;
            expiresAt: Date;
          }
        >;
        legalAcceptances: LegalAcceptanceRecord[];
        stationPriorityTiers: Map<string, StationPriorityTier>;
        playbackEvents: StoredPlaybackEvent[];
      }
    | undefined;
}

const DEFAULT_AUDIO_SAMPLE =
  "https://actions.google.com/sounds/v1/science_fiction/alien_beacon.ogg";

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  primaryColor: "#8B5CF6",
  primaryHoverColor: "#7C3AED",
  secondaryColor: "#27272A",
  accentColor: "#A78BFA",
  backgroundColor: "#09090B",
  surfaceColor: "#18181B",
  textColor: "#FAFAFA",
  mutedTextColor: "#A1A1AA",
  borderColor: "#27272A",
  liveColor: "#EF4444",
  successColor: "#22C55E",
  warningColor: "#F59E0B",
  dangerColor: "#EF4444",
};

function initDatabase() {
  if (global.__THE_QUEUE_STATE__) {
    return global.__THE_QUEUE_STATE__;
  }

  const users = new Map<string, StoredUser>();
  const artistIdentities = new Map<string, StoredArtistIdentity>();
  const sessionTokens = new Map<string, StoredSessionToken>();
  const passwordResetTokens = new Map<string, StoredPasswordResetToken>();
  const emailVerificationTokens = new Map<string, StoredEmailVerificationToken>();
  const securityLogs: StoredSecurityLog[] = [];
  const userPreferences = new Map<string, UserPreferencesDto>();

  // 1. Seed Default Demo User
  const demoUser: StoredUser = {
    id: "user-demo",
    email: "artist@thequeue.live",
    username: "demoartist",
    displayName: "Demo Artist",
    passwordHash: "DemoPassword123!",
    accountStatus: AccountStatus.ACTIVE,
    emailVerified: true,
    bio: "Independent electronic music producer and mixing engineer. Constantly exploring soundscapes.",
    avatarUrl: null,
    country: "United States",
    websiteUrl: "https://thequeue.live",
    roles: [Role.USER],
    permissions: [],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.set(demoUser.id, demoUser);

  // 1b. Seed Artist Identities
  const demoArtist1: StoredArtistIdentity = {
    id: "artist-identity-1",
    userId: demoUser.id,
    artistName: "Demo Artist",
    normalizedArtistName: "demo artist",
    spotifyUrl: "https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb",
    biography: "Electronic and ambient producer creating cinematic soundscapes.",
    profileImageKey: null,
    isDefault: true,
    isPublic: true,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    deletedAt: null,
  };

  const demoArtist2: StoredArtistIdentity = {
    id: "artist-identity-2",
    userId: demoUser.id,
    artistName: "Neon Echo",
    normalizedArtistName: "neon echo",
    spotifyUrl: "https://open.spotify.com/artist/3TVXtAsR1Inumwj472S9r4",
    biography: "Synthwave and cyberpunk alias exploring retro-futuristic beats.",
    profileImageKey: null,
    isDefault: false,
    isPublic: true,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    deletedAt: null,
  };

  const artistOther1: StoredArtistIdentity = {
    id: "artist-identity-other-1",
    userId: "other-user-1",
    artistName: "Astral Motion",
    normalizedArtistName: "astral motion",
    spotifyUrl: "https://open.spotify.com/artist/6eUKZXaKkcviH0Ku9w2n3V",
    biography: "Space bass and psychedelic sounds.",
    profileImageKey: null,
    isDefault: true,
    isPublic: true,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    deletedAt: null,
  };

  const artistOther2: StoredArtistIdentity = {
    id: "artist-identity-other-2",
    userId: "other-user-2",
    artistName: "Vapor Knight",
    normalizedArtistName: "vapor knight",
    spotifyUrl: "https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02",
    biography: "Chillwave & Lo-Fi vibes.",
    profileImageKey: null,
    isDefault: true,
    isPublic: true,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    deletedAt: null,
  };

  artistIdentities.set(demoArtist1.id, demoArtist1);
  artistIdentities.set(demoArtist2.id, demoArtist2);
  artistIdentities.set(artistOther1.id, artistOther1);
  artistIdentities.set(artistOther2.id, artistOther2);

  // 2. Seed Default Administrator User
  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@thequeue.live";
  const adminUsername = process.env.ADMIN_BOOTSTRAP_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || "AdminMasterKey2026!";

  const adminUser: StoredUser = {
    id: "user-admin",
    email: adminEmail,
    username: adminUsername,
    displayName: "System Administrator",
    passwordHash: adminPassword,
    accountStatus: AccountStatus.ACTIVE,
    emailVerified: true,
    bio: "TheQueue Platform Administrator & System Controller.",
    avatarUrl: null,
    country: "United States",
    websiteUrl: null,
    roles: [Role.OWNER_ADMIN, Role.MODERATOR],
    permissions: Object.values(AdminPermission),
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.set(adminUser.id, adminUser);

  // Seed preferences
  userPreferences.set(demoUser.id, {
    emailNotifications: true,
    marketingEmails: false,
    soundEffects: true,
    themeMode: "dark",
  });
  userPreferences.set(adminUser.id, {
    emailNotifications: true,
    marketingEmails: false,
    soundEffects: true,
    themeMode: "dark",
  });

  // 3. Seed Site Customization Theme
  const themeCustomization: StoredThemeCustomization = {
    id: "site-customization-default",
    siteName: "TheQueue",
    primaryLogoUrl: null,
    alternateLogoUrl: null,
    faviconUrl: null,
    tokens: { ...DEFAULT_THEME_TOKENS },
    customCss: null,
    updatedByUserId: adminUser.id,
    updatedAt: new Date().toISOString(),
  };

  const platformSettings = {
    requireManualHostApproval: true,
    updatedAt: new Date().toISOString(),
    updatedByUserId: adminUser.id,
  };

  const hostApplications = new Map<string, StoredHostApplication>();
  const hostProfiles = new Map<string, StoredHostProfile>();
  const stations = new Map<string, StoredStation>();
  const payoutAccounts = new Map<string, StoredPayoutAccount>();
  const sessions = new Map<string, StoredSession>();
  const queues = new Map<string, StoredQueueEntry[]>();
  const tracks = new Map<string, StoredTrack>();
  const submissions = new Map<string, StoredSubmission>();
  const uploadIntents = new Map();
  const stationPriorityTiers = new Map<string, StationPriorityTier>();
  const legalAcceptances: LegalAcceptanceRecord[] = [
    {
      id: "legal-acc-seed-demo",
      userId: demoUser.id,
      documentSlug: "terms",
      version: TERMS_METADATA.version,
      acceptanceSource: "SIGNUP",
      acceptedAt: new Date(demoUser.createdAt).toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: "Desktop Browser",
    },
    {
      id: "legal-acc-seed-admin",
      userId: adminUser.id,
      documentSlug: "terms",
      version: TERMS_METADATA.version,
      acceptanceSource: "SIGNUP",
      acceptedAt: new Date(adminUser.createdAt).toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: "Server Bootstrap",
    },
  ];

  // Seed Host Users, Profiles & Stations
  const kvibeUser: StoredUser = {
    id: "user-kvibe",
    email: "djkvibe@thequeue.live",
    username: "djkvibe",
    displayName: "DJ K-Vibe",
    passwordHash: "HostPassword123!",
    accountStatus: AccountStatus.ACTIVE,
    emailVerified: true,
    bio: "Streamer & Producer listening to independent hip-hop, R&B, and electronic music. Giving honest feedback and playlist placements.",
    avatarUrl: null,
    country: "United States",
    websiteUrl: "https://twitch.tv/djkvibe",
    roles: [Role.USER, Role.HOST],
    permissions: [],
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.set(kvibeUser.id, kvibeUser);

  const aurabeatsUser: StoredUser = {
    id: "user-aurabeats",
    email: "aurabeats@thequeue.live",
    username: "aurabeats",
    displayName: "AuraBeats",
    passwordHash: "HostPassword123!",
    accountStatus: AccountStatus.ACTIVE,
    emailVerified: true,
    bio: "Multi-platinum sound designer & mix engineer reviewing community submissions live on stream.",
    avatarUrl: null,
    country: "Canada",
    websiteUrl: "https://youtube.com/@aurabeats",
    roles: [Role.USER, Role.HOST],
    permissions: [],
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.set(aurabeatsUser.id, aurabeatsUser);

  const metrowaveUser: StoredUser = {
    id: "user-metrowave",
    email: "metrowave@thequeue.live",
    username: "metrowave",
    displayName: "MetroWave",
    passwordHash: "HostPassword123!",
    accountStatus: AccountStatus.ACTIVE,
    emailVerified: true,
    bio: "Synthwave, Cyberpunk, and Retro Electro live station. Reviewing tracks for Spotify editorial pitch.",
    avatarUrl: null,
    country: "United Kingdom",
    websiteUrl: "https://kick.com/metrowave",
    roles: [Role.USER, Role.HOST],
    permissions: [],
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.set(metrowaveUser.id, metrowaveUser);

  // Seed Host Profiles
  const kvibeProfile: StoredHostProfile = {
    id: "host-profile-kvibe",
    userId: kvibeUser.id,
    publicHostName: "DJ K-Vibe",
    normalizedHostName: "dj k-vibe",
    hostSlug: "dj-k-vibe",
    normalizedHostSlug: "dj-k-vibe",
    isApproved: true,
    biography: kvibeUser.bio,
    primaryStreamingPlatform: StreamingPlatform.TWITCH,
    primaryStreamingProfileUrl: "https://twitch.tv/djkvibe",
    country: "United States",
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  hostProfiles.set(kvibeProfile.id, kvibeProfile);

  const auraProfile: StoredHostProfile = {
    id: "host-profile-aurabeats",
    userId: aurabeatsUser.id,
    publicHostName: "AuraBeats",
    normalizedHostName: "aurabeats",
    hostSlug: "aurabeats-studio",
    normalizedHostSlug: "aurabeats-studio",
    isApproved: true,
    biography: aurabeatsUser.bio,
    primaryStreamingPlatform: StreamingPlatform.YOUTUBE,
    primaryStreamingProfileUrl: "https://youtube.com/@aurabeats",
    country: "Canada",
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  hostProfiles.set(auraProfile.id, auraProfile);

  const metroProfile: StoredHostProfile = {
    id: "host-profile-metrowave",
    userId: metrowaveUser.id,
    publicHostName: "MetroWave",
    normalizedHostName: "metrowave",
    hostSlug: "metrowave-synth",
    normalizedHostSlug: "metrowave-synth",
    isApproved: true,
    biography: metrowaveUser.bio,
    primaryStreamingPlatform: StreamingPlatform.KICK,
    primaryStreamingProfileUrl: "https://kick.com/metrowave",
    country: "United Kingdom",
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  hostProfiles.set(metroProfile.id, metroProfile);

  // Seed Payout Accounts (Stripe Connected)
  payoutAccounts.set(kvibeUser.id, {
    id: "payout-kvibe",
    hostId: kvibeProfile.id,
    userId: kvibeUser.id,
    provider: PayoutProvider.STRIPE,
    providerAccountId: "acct_kvibe_live_123456",
    chargesEnabled: true,
    payoutsEnabled: true,
    detailsSubmitted: true,
    isIdentityVerified: true,
    onboardingState: "COMPLETED",
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    updatedAt: new Date().toISOString(),
  });

  payoutAccounts.set(aurabeatsUser.id, {
    id: "payout-aura",
    hostId: auraProfile.id,
    userId: aurabeatsUser.id,
    provider: PayoutProvider.STRIPE,
    providerAccountId: "acct_aura_live_234567",
    chargesEnabled: true,
    payoutsEnabled: true,
    detailsSubmitted: true,
    isIdentityVerified: true,
    onboardingState: "COMPLETED",
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
  });

  payoutAccounts.set(metrowaveUser.id, {
    id: "payout-metro",
    hostId: metroProfile.id,
    userId: metrowaveUser.id,
    provider: PayoutProvider.STRIPE,
    providerAccountId: "acct_metro_live_345678",
    chargesEnabled: true,
    payoutsEnabled: true,
    detailsSubmitted: true,
    isIdentityVerified: true,
    onboardingState: "COMPLETED",
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Seed Stations
  const station1: StoredStation = {
    id: "station-k-vibe",
    hostId: kvibeProfile.id,
    stationName: "DJ K-Vibe",
    normalizedStationName: "dj k-vibe",
    slug: "dj-k-vibe",
    description: "Streamer & Producer listening to independent hip-hop, R&B, and electronic music. Honest live feedback and playlist placements.",
    profileImageKey: null,
    bannerImageKey: null,
    status: StationStatus.ACTIVE,
    isPublicVisible: true,
    isApproved: true,
    primaryStreamingPlatform: StreamingPlatform.TWITCH,
    streamUrl: "https://twitch.tv",
    acceptedContentRules: "Hip-Hop, R&B, Electronic. MP3/WAV under 5 minutes.",
    explicitContentAllowed: true,
    maxTrackDurationSeconds: 300,
    maxQueueSize: 50,
    isLive: true,
    currentLiveSessionId: "session-k-vibe",
    hostName: "DJ K-Vibe",
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  stations.set(station1.id, station1);

  const station2: StoredStation = {
    id: "station-aurabeats",
    hostId: auraProfile.id,
    stationName: "AuraBeats",
    normalizedStationName: "aurabeats",
    slug: "aurabeats-studio",
    description: "Multi-platinum sound designer & mix engineer reviewing community submissions live on stream.",
    profileImageKey: null,
    bannerImageKey: null,
    status: StationStatus.ACTIVE,
    isPublicVisible: true,
    isApproved: true,
    primaryStreamingPlatform: StreamingPlatform.YOUTUBE,
    streamUrl: "https://youtube.com",
    acceptedContentRules: "All genres welcome. High quality audio preferred.",
    explicitContentAllowed: true,
    maxTrackDurationSeconds: 360,
    maxQueueSize: 40,
    isLive: true,
    currentLiveSessionId: "session-aurabeats",
    hostName: "AuraBeats",
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  stations.set(station2.id, station2);

  const station3: StoredStation = {
    id: "station-metrowave",
    hostId: metroProfile.id,
    stationName: "MetroWave",
    normalizedStationName: "metrowave",
    slug: "metrowave-synth",
    description: "Synthwave, Cyberpunk, and Retro Electro live station. Reviewing tracks for Spotify editorial pitch.",
    profileImageKey: null,
    bannerImageKey: null,
    status: StationStatus.ACTIVE,
    isPublicVisible: true,
    isApproved: true,
    primaryStreamingPlatform: StreamingPlatform.KICK,
    streamUrl: "https://kick.com",
    acceptedContentRules: "Synthwave, Darksynth, Retrowave, Cyberpunk.",
    explicitContentAllowed: false,
    maxTrackDurationSeconds: 420,
    maxQueueSize: 30,
    isLive: true,
    currentLiveSessionId: "session-metrowave",
    hostName: "MetroWave",
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  stations.set(station3.id, station3);

  // Seed an approved offline station
  const station4: StoredStation = {
    id: "station-soundwave",
    hostId: "host-profile-soundwave",
    stationName: "SoundWave FM",
    normalizedStationName: "soundwave fm",
    slug: "soundwave-fm",
    description: "Indie Pop, Rock and Singer-Songwriter showcases every Tuesday and Thursday.",
    profileImageKey: null,
    bannerImageKey: null,
    status: StationStatus.ACTIVE,
    isPublicVisible: true,
    isApproved: true,
    primaryStreamingPlatform: StreamingPlatform.TWITCH,
    streamUrl: "https://twitch.tv",
    acceptedContentRules: "Original tracks only. No unmixed voice memos.",
    explicitContentAllowed: true,
    maxTrackDurationSeconds: 300,
    maxQueueSize: 25,
    isLive: false,
    currentLiveSessionId: null,
    hostName: "SoundWave FM",
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  stations.set(station4.id, station4);

  // 4. Seed Sessions
  const session1: StoredSession = {
    id: "session-k-vibe",
    stationId: "station-k-vibe",
    stationName: "DJ K-Vibe Radio",
    stationSlug: "dj-k-vibe",
    hostName: "DJ K-Vibe",
    hostBio: "Streamer & Producer listening to independent hip-hop, R&B, and electronic music. Giving honest feedback and playlist placements.",
    liveTitle: "Friday Night Live Heat — Artist Song Reviews & Feedback",
    status: LiveSessionStatus.LIVE,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    primaryStreamingPlatform: StreamingPlatform.TWITCH,
    streamUrl: "https://twitch.tv",
    queueRevision: 4,
    submissionsOpen: true,
    freeLineOpen: true,
    paidSubmissionsOpen: true,
    currentQueueEntryId: "entry-1",
    currentTrack: {
      songName: "Solar Flare",
      artistName: "Astral Motion",
      durationSeconds: 198,
    },
    tiers: [
      {
        tierSnapshotId: "tier-kvibe-1",
        name: "Silver Fast-Track",
        priceCents: 500,
        priorityRank: 1,
        colorSlot: "TIER_COLOR_1",
        available: true,
      },
      {
        tierSnapshotId: "tier-kvibe-2",
        name: "Gold VIP Review",
        priceCents: 1500,
        priorityRank: 2,
        colorSlot: "TIER_COLOR_2",
        available: true,
      },
      {
        tierSnapshotId: "tier-kvibe-3",
        name: "Diamond Instant Play",
        priceCents: 3000,
        priorityRank: 3,
        colorSlot: "TIER_COLOR_3",
        available: true,
      },
    ],
  };

  const session2: StoredSession = {
    id: "session-aurabeats",
    stationId: "station-aurabeats",
    stationName: "AuraBeats Studio Live",
    stationSlug: "aurabeats-studio",
    hostName: "AuraBeats",
    hostBio: "Multi-platinum sound designer & mix engineer reviewing community submissions live on stream.",
    liveTitle: "Saturday Producer Showcase & Mix Critiques",
    status: LiveSessionStatus.LIVE,
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    primaryStreamingPlatform: StreamingPlatform.YOUTUBE,
    streamUrl: "https://youtube.com",
    queueRevision: 2,
    submissionsOpen: true,
    freeLineOpen: true,
    paidSubmissionsOpen: true,
    currentQueueEntryId: null,
    currentTrack: {
      songName: "Velvet Groove",
      artistName: "Luna & The Waves",
      durationSeconds: 215,
      spotifyUrl: "https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb",
      artistIdentityId: "artist-identity-1",
    },
    tiers: [
      {
        tierSnapshotId: "tier-aura-1",
        name: "Priority Jump",
        priceCents: 1000,
        priorityRank: 1,
        colorSlot: "TIER_COLOR_1",
        available: true,
      },
      {
        tierSnapshotId: "tier-aura-2",
        name: "Full Mix Breakdown VIP",
        priceCents: 2500,
        priorityRank: 2,
        colorSlot: "TIER_COLOR_2",
        available: true,
      },
    ],
  };

  const session3: StoredSession = {
    id: "session-metrowave",
    stationId: "station-metrowave",
    stationName: "MetroWave Synthetics",
    stationSlug: "metrowave-synth",
    hostName: "MetroWave",
    hostBio: "Synthwave, Cyberpunk, and Retro Electro live station. Reviewing tracks for Spotify editorial pitch.",
    liveTitle: "Neon Nights Live Submissions & Sound Design Talk",
    status: LiveSessionStatus.LIVE,
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    primaryStreamingPlatform: StreamingPlatform.KICK,
    streamUrl: "https://kick.com",
    queueRevision: 1,
    submissionsOpen: true,
    freeLineOpen: true,
    paidSubmissionsOpen: true,
    currentQueueEntryId: null,
    currentTrack: null,
    tiers: [
      {
        tierSnapshotId: "tier-metro-1",
        name: "Express Queue",
        priceCents: 750,
        priorityRank: 1,
        colorSlot: "TIER_COLOR_1",
        available: true,
      },
    ],
  };

  sessions.set(session1.id, session1);
  sessions.set(session2.id, session2);
  sessions.set(session3.id, session3);

  // 5. Seed Queues
  const queue1: StoredQueueEntry[] = [
    {
      id: "entry-1",
      liveSessionId: session1.id,
      status: QueueStatus.PLAYING,
      sortOrder: 1,
      priorityRank: 2,
      isPriority: true,
      tierName: "Gold VIP Review",
      colorSlot: "TIER_COLOR_2",
      songName: "Solar Flare",
      artistName: "Astral Motion",
      durationSeconds: 198,
      submittedAt: new Date(Date.now() - 3000000).toISOString(),
      spotifyUrl: "https://open.spotify.com/artist/6eUKZXaKkcviH0Ku9w2n3V",
      artistIdentityId: "artist-identity-other-1",
      submissionId: "sub-1",
      submittingUserId: "other-user-1",
      sourceTrackId: "track-1",
    },
    {
      id: "entry-2",
      liveSessionId: session1.id,
      status: QueueStatus.NEXT,
      sortOrder: 2,
      priorityRank: 1,
      isPriority: true,
      tierName: "Silver Fast-Track",
      colorSlot: "TIER_COLOR_1",
      songName: "Cyber Sunset",
      artistName: "Vapor Knight",
      durationSeconds: 210,
      submittedAt: new Date(Date.now() - 2500000).toISOString(),
      spotifyUrl: "https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02",
      artistIdentityId: "artist-identity-other-2",
      submissionId: "sub-2",
      submittingUserId: "other-user-2",
      sourceTrackId: "track-2",
    },
    {
      id: "entry-3",
      liveSessionId: session1.id,
      status: QueueStatus.QUEUED,
      sortOrder: 3,
      priorityRank: 0,
      isPriority: false,
      tierName: null,
      colorSlot: "FREE_LINE",
      songName: "Midnight Echoes",
      artistName: demoUser.displayName,
      durationSeconds: 185,
      submittedAt: new Date(Date.now() - 1200000).toISOString(),
      spotifyUrl: "https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb",
      artistIdentityId: "artist-identity-1",
      submissionId: "sub-3",
      submittingUserId: demoUser.id,
      sourceTrackId: "track-user-1",
    },
  ];

  queues.set(session1.id, queue1);
  queues.set(session2.id, []);
  queues.set(session3.id, []);

  // 6. Seed Tracks for Demo User
  const track1: StoredTrack = {
    id: "track-user-1",
    userId: demoUser.id,
    artistIdentityId: "artist-identity-1",
    songName: "Midnight Echoes",
    albumName: "Neon Dreamscapes",
    explicitContent: false,
    bpm: 124,
    musicalKey: "A Minor",
    durationSeconds: 185,
    processingState: ProcessingState.READY,
    artistIdentity: {
      id: "artist-identity-1",
      artistName: demoUser.displayName,
      spotifyUrl: "https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb",
    },
    audioDataUrl: DEFAULT_AUDIO_SAMPLE,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  };

  const track2: StoredTrack = {
    id: "track-user-2",
    userId: demoUser.id,
    artistIdentityId: "artist-identity-1",
    songName: "Golden Horizon",
    albumName: "Neon Dreamscapes",
    explicitContent: false,
    bpm: 110,
    musicalKey: "F Major",
    durationSeconds: 215,
    processingState: ProcessingState.READY,
    artistIdentity: {
      id: "artist-identity-1",
      artistName: demoUser.displayName,
      spotifyUrl: "https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb",
    },
    audioDataUrl: DEFAULT_AUDIO_SAMPLE,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  };

  const track3: StoredTrack = {
    id: "track-user-3",
    userId: demoUser.id,
    artistIdentityId: "artist-identity-2",
    songName: "Late Night Drive",
    albumName: null,
    explicitContent: false,
    bpm: 95,
    musicalKey: "C Major",
    durationSeconds: 240,
    processingState: ProcessingState.READY,
    artistIdentity: {
      id: "artist-identity-2",
      artistName: "Neon Echo",
      spotifyUrl: "https://open.spotify.com/artist/3TVXtAsR1Inumwj472S9r4",
    },
    audioDataUrl: DEFAULT_AUDIO_SAMPLE,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  };

  tracks.set(track1.id, track1);
  tracks.set(track2.id, track2);
  tracks.set(track3.id, track3);

  // 7. Seed Submissions for demo user
  const sub1: StoredSubmission = {
    id: "sub-3",
    submittingUserId: demoUser.id,
    liveSessionId: session1.id,
    sessionTitle: session1.liveTitle,
    sessionStatus: session1.status,
    stationName: session1.stationName,
    songName: track1.songName,
    artistName: demoUser.displayName,
    durationSeconds: track1.durationSeconds,
    isPriority: false,
    tierName: null,
    tierColorSlot: null,
    currentQueueStatus: QueueStatus.QUEUED,
    submittedAt: new Date(Date.now() - 1200000).toISOString(),
    spotifyUrl: "https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb",
    sourceTrackId: track1.id,
    artistIdentityId: track1.artistIdentityId,
    queueEntry: {
      id: "entry-3",
      status: QueueStatus.QUEUED,
      priorityRank: 0,
      sortOrder: 3,
    },
  };

  submissions.set(sub1.id, sub1);

  // Create initial demo session cookie token
  const initialSessionToken: StoredSessionToken = {
    id: "sess-demo-initial",
    token: "demo-session-token-12345",
    userId: demoUser.id,
    ipAddress: "127.0.0.1",
    userAgent: "Desktop Browser",
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
  };
  sessionTokens.set(initialSessionToken.token, initialSessionToken);

  securityLogs.push({
    id: "sec-log-1",
    userId: demoUser.id,
    eventType: "LOGIN_SUCCESS",
    ipAddress: "127.0.0.1",
    userAgent: "Desktop Browser",
    createdAt: new Date().toISOString(),
  });

  const playbackEvents: StoredPlaybackEvent[] = [];

  global.__THE_QUEUE_STATE__ = {
    users,
    artistIdentities,
    sessionTokens,
    passwordResetTokens,
    emailVerificationTokens,
    securityLogs,
    userPreferences,
    themeCustomization,
    platformSettings,
    hostApplications,
    hostProfiles,
    stations,
    payoutAccounts,
    sessions,
    queues,
    tracks,
    submissions,
    uploadIntents,
    legalAcceptances,
    stationPriorityTiers,
    playbackEvents,
  };

  return global.__THE_QUEUE_STATE__;
}

export const serverDb = initDatabase();

// ============================================================================
// Legal & Terms of Service Server Helpers
// ============================================================================

export function recordLegalAcceptance(params: {
  userId: string;
  documentSlug?: string;
  version?: string;
  acceptanceSource: LegalAcceptanceSource;
  ipAddress?: string;
  userAgent?: string;
}): LegalAcceptanceRecord {
  const documentSlug = params.documentSlug || "terms";
  const version =
    params.version ||
    (documentSlug === "privacy"
      ? PRIVACY_METADATA.version
      : TERMS_METADATA.version);
  const ipAddress = params.ipAddress || "127.0.0.1";
  const userAgent = params.userAgent || "Web Browser";

  // Check for existing acceptance (idempotency in memory)
  const existing = serverDb.legalAcceptances.find(
    (r) =>
      r.userId === params.userId &&
      r.documentSlug === documentSlug &&
      r.version === version,
  );

  if (existing) {
    // Attempt DB sync in background if not already recorded
    persistLegalAcceptanceToDb({
      userId: params.userId,
      documentSlug,
      versionString: version,
      acceptanceSource: params.acceptanceSource,
      ipAddress,
      userAgent,
    }).catch(() => {});
    return existing;
  }

  const record: LegalAcceptanceRecord = {
    id: `legal-acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: params.userId,
    documentSlug,
    version,
    acceptanceSource: params.acceptanceSource,
    acceptedAt: new Date().toISOString(),
    ipAddress,
    userAgent,
  };
  serverDb.legalAcceptances.push(record);

  // Background Postgres persistence
  persistLegalAcceptanceToDb({
    userId: params.userId,
    documentSlug,
    versionString: version,
    acceptanceSource: params.acceptanceSource,
    ipAddress,
    userAgent,
  }).catch(() => {});

  return record;
}

export async function recordLegalAcceptanceAsync(params: {
  userId: string;
  documentSlug?: string;
  version?: string;
  acceptanceSource: LegalAcceptanceSource;
  ipAddress?: string;
  userAgent?: string;
}): Promise<LegalAcceptanceRecord> {
  const documentSlug = params.documentSlug || "terms";
  const version =
    params.version ||
    (documentSlug === "privacy"
      ? PRIVACY_METADATA.version
      : TERMS_METADATA.version);
  const ipAddress = params.ipAddress || "127.0.0.1";
  const userAgent = params.userAgent || "Web Browser";

  // 1. In-memory ledger update with deduplication
  let record = serverDb.legalAcceptances.find(
    (r) =>
      r.userId === params.userId &&
      r.documentSlug === documentSlug &&
      r.version === version,
  );

  if (!record) {
    record = {
      id: `legal-acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: params.userId,
      documentSlug,
      version,
      acceptanceSource: params.acceptanceSource,
      acceptedAt: new Date().toISOString(),
      ipAddress,
      userAgent,
    };
    serverDb.legalAcceptances.push(record);
  }

  // 2. Persist to PostgreSQL if available
  try {
    const dbRecord = await persistLegalAcceptanceToDb({
      userId: params.userId,
      documentSlug,
      versionString: version,
      acceptanceSource: params.acceptanceSource,
      ipAddress,
      userAgent,
    });
    if (dbRecord) {
      record.id = dbRecord.id;
      record.acceptedAt = dbRecord.acceptedAt.toISOString();
    }
  } catch (err) {
    // Database fallback handled gracefully
  }

  return record;
}

export function getUserLegalAcceptances(userId: string): LegalAcceptanceRecord[] {
  return serverDb.legalAcceptances.filter((r) => r.userId === userId);
}

export async function getUserLegalAcceptancesAsync(
  userId: string,
): Promise<LegalAcceptanceRecord[]> {
  try {
    const dbRecords = await getDbLegalAcceptancesForUser(userId);
    if (dbRecords && dbRecords.length > 0) {
      type DbLegalAcceptance = Awaited<
        ReturnType<typeof getDbLegalAcceptancesForUser>
      >[number];
      return dbRecords.map((r: DbLegalAcceptance) => ({
        id: r.id,
        userId: r.userId,
        documentSlug: r.version?.document?.slug || "terms",
        version: r.version?.versionString || TERMS_METADATA.version,
        acceptanceSource: r.acceptanceSource as LegalAcceptanceSource,
        acceptedAt: r.acceptedAt.toISOString(),
        ipAddress: r.ipAddress,
        userAgent: r.userAgent || undefined,
      }));
    }
  } catch (err) {
    // Fallback to in-memory
  }
  return getUserLegalAcceptances(userId);
}

export function hasUserAcceptedCurrentTerms(userId: string): boolean {
  return serverDb.legalAcceptances.some(
    (r) =>
      r.userId === userId &&
      r.documentSlug === "terms" &&
      r.version === TERMS_METADATA.version,
  );
}

export async function hasUserAcceptedCurrentTermsAsync(
  userId: string,
): Promise<boolean> {
  try {
    const dbAccepted = await hasUserAcceptedCurrentVersionInDb(
      userId,
      "terms",
      TERMS_METADATA.version,
    );
    if (dbAccepted) return true;
  } catch (err) {
    // Fallback to in-memory
  }
  return hasUserAcceptedCurrentTerms(userId);
}

// Station, Host & Slug helper functions
export function generateUniqueStationSlug(baseName: string, excludeStationId?: string): string {
  let candidate = slugifyHostname(baseName);
  if (!candidate || candidate.length < 3) {
    candidate = "station";
  }

  // Check if reserved
  if (RESERVED_SLUGS.includes(candidate as any)) {
    candidate = `${candidate}-station`;
  }

  // Check existing slugs in database
  let slug = candidate;
  let counter = 2;
  const isSlugTaken = (testSlug: string) => {
    for (const st of serverDb.stations.values()) {
      if (st.id !== excludeStationId && st.slug.toLowerCase() === testSlug.toLowerCase()) {
        return true;
      }
    }
    return false;
  };

  while (isSlugTaken(slug)) {
    slug = `${candidate}-${counter}`;
    counter++;
  }

  return slug;
}

export function getPublicStationsList(): StationSummary[] {
  const result: StationSummary[] = [];
  for (const st of serverDb.stations.values()) {
    if (st.isApproved && st.isPublicVisible && st.status === StationStatus.ACTIVE) {
      // Look up if currently live
      let live = false;
      let sessionId: string | null = null;
      for (const sess of serverDb.sessions.values()) {
        if (sess.stationId === st.id && sess.status === LiveSessionStatus.LIVE) {
          live = true;
          sessionId = sess.id;
          break;
        }
      }

      const hostProfile = serverDb.hostProfiles.get(st.hostId);
      const hostUser = hostProfile ? serverDb.users.get(hostProfile.userId) : null;
      const hostName = st.hostName || hostProfile?.publicHostName || hostUser?.displayName || st.stationName;

      result.push({
        ...st,
        hostName,
        isLive: live,
        currentLiveSessionId: sessionId,
      });
    }
  }
  return result;
}

export function getPublicStationDetail(hostnameOrSlug: string): PublicStationDetail | null {
  const normalized = hostnameOrSlug.toLowerCase().trim();
  let station: StoredStation | null = null;
  for (const st of serverDb.stations.values()) {
    if (st.slug.toLowerCase() === normalized) {
      station = st;
      break;
    }
  }

  if (!station || !station.isApproved || station.status !== StationStatus.ACTIVE) {
    return null;
  }

  // Find active live session if any
  let currentSession: PublicLiveSessionDetail | null = null;
  let isLive = false;
  for (const sess of serverDb.sessions.values()) {
    if (sess.stationId === station.id && sess.status === LiveSessionStatus.LIVE) {
      currentSession = sess;
      isLive = true;
      break;
    }
  }

  // Find host bio
  const hostProfile = serverDb.hostProfiles.get(station.hostId);
  const hostUser = hostProfile ? serverDb.users.get(hostProfile.userId) : null;

  return {
    id: station.id,
    stationName: station.stationName,
    hostname: station.slug,
    slug: station.slug,
    description: station.description || null,
    profileImageKey: station.profileImageKey || null,
    bannerImageKey: station.bannerImageKey || null,
    primaryStreamingPlatform: station.primaryStreamingPlatform,
    streamUrl: station.streamUrl || null,
    acceptedContentRules: station.acceptedContentRules || null,
    explicitContentAllowed: station.explicitContentAllowed,
    maxTrackDurationSeconds: station.maxTrackDurationSeconds,
    maxQueueSize: station.maxQueueSize,
    hostName: station.hostName || hostProfile?.publicHostName || station.stationName,
    hostBio: hostProfile?.biography || hostUser?.bio || null,
    isLive,
    currentSession,
  };
}

export function approveHostApplicationInternal(
  applicationId: string,
  actorUserId: string,
): { success: boolean; station?: StoredStation; error?: string } {
  const app = serverDb.hostApplications.get(applicationId);
  if (!app) {
    return { success: false, error: "Host application not found" };
  }

  // Strict check: Stripe Connect must be complete
  const payout = serverDb.payoutAccounts.get(app.applicantUserId);
  const isStripeComplete =
    payout?.chargesEnabled && payout?.payoutsEnabled && payout?.detailsSubmitted;

  if (!isStripeComplete) {
    return {
      success: false,
      error: "Cannot approve host application: Stripe Connect onboarding is incomplete",
    };
  }

  // Assign Role.HOST to applicant user
  const applicant = serverDb.users.get(app.applicantUserId);
  if (applicant) {
    if (!applicant.roles.includes(Role.HOST)) {
      applicant.roles.push(Role.HOST);
      applicant.updatedAt = new Date().toISOString();
    }
  }

  // Create or update HostProfile
  let hostProfile: StoredHostProfile | undefined;
  for (const hp of serverDb.hostProfiles.values()) {
    if (hp.userId === app.applicantUserId) {
      hostProfile = hp;
      break;
    }
  }

  const generatedSlug = generateUniqueStationSlug(app.publicHostName);

  if (!hostProfile) {
    hostProfile = {
      id: `host-profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: app.applicantUserId,
      publicHostName: app.publicHostName,
      normalizedHostName: app.publicHostName.toLowerCase().trim(),
      hostSlug: generatedSlug,
      normalizedHostSlug: generatedSlug,
      isApproved: true,
      biography: app.biography || applicant?.bio || null,
      primaryStreamingPlatform: app.primaryStreamingPlatform,
      primaryStreamingProfileUrl: app.primaryStreamingProfileUrl,
      country: app.country,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    serverDb.hostProfiles.set(hostProfile.id, hostProfile);
  } else {
    hostProfile.isApproved = true;
    hostProfile.updatedAt = new Date().toISOString();
  }

  // Link payout account to host profile
  if (payout) {
    payout.hostId = hostProfile.id;
  }

  // Create or activate persistent Station
  let station: StoredStation | undefined;
  for (const st of serverDb.stations.values()) {
    if (st.hostId === hostProfile.id) {
      station = st;
      break;
    }
  }

  if (!station) {
    station = {
      id: `station-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hostId: hostProfile.id,
      stationName: app.publicHostName,
      normalizedStationName: app.publicHostName.toLowerCase().trim(),
      slug: hostProfile.hostSlug,
      description: app.biography || applicant?.bio || "Live music review and broadcaster station.",
      profileImageKey: null,
      bannerImageKey: null,
      status: StationStatus.ACTIVE,
      isPublicVisible: true,
      isApproved: true,
      primaryStreamingPlatform: app.primaryStreamingPlatform,
      streamUrl: app.primaryStreamingProfileUrl,
      acceptedContentRules: app.acceptedGenres ? `Genres: ${app.acceptedGenres}` : "All original music welcome.",
      explicitContentAllowed: true,
      maxTrackDurationSeconds: 300,
      maxQueueSize: 50,
      isLive: false,
      currentLiveSessionId: null,
      hostName: app.publicHostName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    serverDb.stations.set(station.id, station);
  } else {
    station.isApproved = true;
    station.status = StationStatus.ACTIVE;
    station.isPublicVisible = true;
    station.updatedAt = new Date().toISOString();
  }

  // Update application record
  app.status = HostApplicationStatus.APPROVED;
  app.payoutOnboardingStatus = "COMPLETED";
  app.reviewedByUserId = actorUserId;
  app.reviewedAt = new Date().toISOString();
  app.stationSlug = station.slug;
  app.updatedAt = new Date().toISOString();

  return { success: true, station };
}

// When requireManualHostApproval is set to false, auto-approve any eligible applications with complete Stripe
export function syncAutomaticApprovalsIfApplicable(actorUserId = "system") {
  if (serverDb.platformSettings.requireManualHostApproval) {
    return;
  }

  for (const app of serverDb.hostApplications.values()) {
    if (
      app.status === HostApplicationStatus.SUBMITTED ||
      app.status === HostApplicationStatus.UNDER_REVIEW ||
      app.status === HostApplicationStatus.PAYMENT_VERIFICATION_REQUIRED
    ) {
      const payout = serverDb.payoutAccounts.get(app.applicantUserId);
      const isStripeComplete =
        payout?.chargesEnabled && payout?.payoutsEnabled && payout?.detailsSubmitted;

      if (isStripeComplete) {
        approveHostApplicationInternal(app.id, actorUserId);
      }
    }
  }
}

// Auth helper functions for Next.js API Routes
export function getAuthenticatedUser(cookieHeader?: string | null): StoredUser | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:session_token|platform_session|__Host-platform_session)=([^;]+)/);
  if (!match) return null;
  const token = match[1];
  const session = serverDb.sessionTokens.get(token);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    serverDb.sessionTokens.delete(token);
    return null;
  }
  session.lastSeenAt = new Date().toISOString();
  return serverDb.users.get(session.userId) || null;
}

export function createSessionForUser(
  userId: string,
  ipAddress = "127.0.0.1",
  userAgent = "Browser",
): { token: string; cookie: string } {
  const token = `sess_${Math.random().toString(36).substring(2)}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 86400000 * 7); // 7 days

  const sessionRecord: StoredSessionToken = {
    id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    token,
    userId,
    ipAddress,
    userAgent,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  serverDb.sessionTokens.set(token, sessionRecord);

  const isProd = process.env.NODE_ENV === "production";
  const cookie = `session_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${isProd ? "; Secure" : ""}`;
  return { token, cookie };
}

export function sanitizeUser(user: StoredUser): UserProfile {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

export function getPublicUserProfile(usernameOrId: string): PublicUserProfile | null {
  const query = usernameOrId.trim().toLowerCase();
  const user = Array.from(serverDb.users.values()).find(
    (u) => u.username.toLowerCase() === query || u.id === usernameOrId
  );
  if (!user) return null;

  // Active public artist identities
  const artistIdentities = Array.from(serverDb.artistIdentities.values())
    .filter((a) => a.userId === user.id && !a.deletedAt && a.isPublic !== false)
    .map((a) => ({
      id: a.id,
      artistName: a.artistName,
      spotifyUrl: a.spotifyUrl,
      biography: a.biography,
    }));

  // Public tracks only (tracks default to private, strictly filter by isPublic === true)
  const publicTracks: TrackSummary[] = Array.from(serverDb.tracks.values())
    .filter((t) => t.userId === user.id && t.isPublic === true && t.processingState === "READY")
    .map((t) => ({
      id: t.id,
      userId: t.userId,
      artistIdentityId: t.artistIdentityId,
      songName: t.songName,
      albumName: t.albumName,
      explicitContent: t.explicitContent,
      bpm: t.bpm,
      musicalKey: t.musicalKey,
      durationSeconds: t.durationSeconds,
      processingState: t.processingState,
      isPublic: true,
      artistIdentity: t.artistIdentity,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl || null,
    country: user.country,
    websiteUrl: user.websiteUrl,
    spotifyProfileUrl: user.spotifyProfileUrl,
    genres: user.genres || ["Independent", "Electronic"],
    artistIdentities,
    publicTracks,
    stats: {
      publicTracksCount: publicTracks.length,
      artistIdentitiesCount: artistIdentities.length,
      joinedDate: String(user.createdAt),
    },
  };
}

export function getOverlayDataForStation(hostname: string) {
  const target = hostname.trim().toLowerCase();
  const station = Array.from(serverDb.stations.values()).find(
    (s) => s.slug.toLowerCase() === target
  );

  const session = Array.from(serverDb.sessions.values()).find(
    (ls) =>
      (station && ls.stationId === station.id) ||
      ls.stationSlug.toLowerCase() === target
  );

  if (!station && !session) return null;

  const stationName = station ? station.stationName : session ? session.stationName : hostname;
  const stationSlug = station ? station.slug : session ? session.stationSlug : hostname;
  const isLive = session ? session.status === LiveSessionStatus.LIVE : false;

  let nowPlaying: any = null;
  if (session && isLive) {
    const queue = serverDb.queues.get(session.id) || [];
    const playingEntry = queue.find(
      (e) => e.liveSessionId === session.id && e.status === QueueStatus.PLAYING
    );

    if (playingEntry) {
      nowPlaying = {
        id: playingEntry.id,
        songName: playingEntry.songName,
        artistName: playingEntry.artistName,
        spotifyUrl: playingEntry.spotifyUrl || null,
        durationSeconds: playingEntry.durationSeconds,
        tierName: playingEntry.tierName || null,
        colorSlot: playingEntry.colorSlot || null,
        isPriority: playingEntry.isPriority || false,
      };
    }
  }

  return {
    stationName,
    hostname: stationSlug,
    isLive,
    nowPlaying,
    theme: {
      style: "modern",
      accentColor: "#8B5CF6",
    },
  };
}

export function createPasswordResetToken(email: string): string | null {
  const normalizedEmail = email.trim().toLowerCase();
  const user = Array.from(serverDb.users.values()).find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );
  if (!user) return null;

  const token = `rst_${Math.random().toString(36).substring(2)}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 3600000 * 2); // 2 hours
  serverDb.passwordResetTokens.set(token, {
    token,
    userId: user.id,
    email: user.email,
    expiresAt: expiresAt.toISOString(),
    used: false,
    createdAt: new Date().toISOString(),
  });
  return token;
}

export function verifyAndConsumePasswordResetToken(
  token: string,
  newPassword: string
): { success: boolean; message?: string } {
  const resetRecord = serverDb.passwordResetTokens.get(token);
  if (!resetRecord) {
    return { success: false, message: "Invalid or expired reset token." };
  }
  if (resetRecord.used) {
    return { success: false, message: "This reset link has already been used." };
  }
  if (new Date(resetRecord.expiresAt) < new Date()) {
    return { success: false, message: "This reset link has expired." };
  }

  const user = serverDb.users.get(resetRecord.userId);
  if (!user) {
    return { success: false, message: "User account not found." };
  }

  user.passwordHash = newPassword;
  user.updatedAt = new Date().toISOString();
  resetRecord.used = true;
  serverDb.passwordResetTokens.set(token, resetRecord);

  // Invalidate previous sessions for security on password reset
  for (const [sessToken, sess] of serverDb.sessionTokens.entries()) {
    if (sess.userId === user.id) {
      serverDb.sessionTokens.delete(sessToken);
    }
  }

  return { success: true };
}

export function createEmailVerificationToken(userId: string): string {
  const user = serverDb.users.get(userId);
  const email = user ? user.email : "";
  const token = `vfy_${Math.random().toString(36).substring(2)}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 86400000 * 3); // 3 days

  serverDb.emailVerificationTokens.set(token, {
    token,
    userId,
    email,
    expiresAt: expiresAt.toISOString(),
    used: false,
    createdAt: new Date().toISOString(),
  });
  return token;
}

export function verifyAndConsumeEmailVerificationToken(
  token: string,
  userId?: string
): { success: boolean; message?: string } {
  const vfyRecord = serverDb.emailVerificationTokens.get(token);
  if (vfyRecord) {
    if (vfyRecord.used) {
      return { success: false, message: "Email verification link has already been used." };
    }
    if (new Date(vfyRecord.expiresAt) < new Date()) {
      return { success: false, message: "Verification link has expired." };
    }
    const user = serverDb.users.get(vfyRecord.userId);
    if (user) {
      user.emailVerified = true;
      user.updatedAt = new Date().toISOString();
      vfyRecord.used = true;
      serverDb.emailVerificationTokens.set(token, vfyRecord);
      return { success: true };
    }
  }

  if (userId) {
    const user = serverDb.users.get(userId);
    if (user) {
      user.emailVerified = true;
      user.updatedAt = new Date().toISOString();
      return { success: true };
    }
  }

  return { success: false, message: "Invalid or expired verification token." };
}

// ============================================================================
// Artist Identity Server Helpers & Ownership Control
// ============================================================================

export function getArtistIdentitiesForUser(userId: string): ArtistIdentitySummary[] {
  const list: ArtistIdentitySummary[] = [];
  for (const identity of serverDb.artistIdentities.values()) {
    if (identity.userId === userId && !identity.deletedAt) {
      let trackCount = 0;
      for (const tr of serverDb.tracks.values()) {
        if (tr.artistIdentityId === identity.id) {
          trackCount++;
        }
      }
      let submissionCount = 0;
      for (const sub of serverDb.submissions.values()) {
        if (sub.artistIdentityId === identity.id) {
          submissionCount++;
        }
      }
      list.push({
        id: identity.id,
        userId: identity.userId,
        artistName: identity.artistName,
        spotifyUrl: identity.spotifyUrl,
        biography: identity.biography,
        profileImageKey: identity.profileImageKey,
        isDefault: identity.isDefault,
        trackCount,
        submissionCount,
        createdAt: identity.createdAt,
        updatedAt: identity.updatedAt,
      });
    }
  }

  return list.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function getArtistIdentityById(id: string): StoredArtistIdentity | null {
  const identity = serverDb.artistIdentities.get(id);
  if (!identity || identity.deletedAt) return null;
  return identity;
}

export function createArtistIdentity(
  userId: string,
  data: CreateArtistIdentityDto,
): StoredArtistIdentity {
  const now = new Date().toISOString();
  const id = `artist-identity-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // If this is set as default or the user has no identities, make it default
  const existing = getArtistIdentitiesForUser(userId);
  const shouldBeDefault = data.isDefault || existing.length === 0;

  if (shouldBeDefault) {
    for (const item of serverDb.artistIdentities.values()) {
      if (item.userId === userId && item.isDefault) {
        item.isDefault = false;
        item.updatedAt = now;
      }
    }
  }

  const newIdentity: StoredArtistIdentity = {
    id,
    userId,
    artistName: data.artistName.trim(),
    normalizedArtistName: data.artistName.trim().toLowerCase(),
    spotifyUrl: data.spotifyUrl || null,
    biography: data.biography || null,
    profileImageKey: data.profileImageKey || null,
    isDefault: shouldBeDefault,
    isPublic: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  serverDb.artistIdentities.set(id, newIdentity);
  return newIdentity;
}

export function updateArtistIdentity(
  id: string,
  userId: string,
  data: UpdateArtistIdentityDto,
): StoredArtistIdentity | null {
  const identity = serverDb.artistIdentities.get(id);
  if (!identity || identity.deletedAt) return null;
  // Authorization check: User must own the Artist Identity
  if (identity.userId !== userId) {
    throw new Error("Unauthorized: You do not own this Artist Identity.");
  }

  const now = new Date().toISOString();

  if (data.isDefault) {
    for (const item of serverDb.artistIdentities.values()) {
      if (item.userId === userId && item.id !== id && item.isDefault) {
        item.isDefault = false;
        item.updatedAt = now;
      }
    }
    identity.isDefault = true;
  } else if (data.isDefault === false) {
    identity.isDefault = false;
  }

  if (data.artistName !== undefined) {
    identity.artistName = data.artistName.trim();
    identity.normalizedArtistName = data.artistName.trim().toLowerCase();
  }
  if (data.spotifyUrl !== undefined) {
    identity.spotifyUrl = data.spotifyUrl || null;
  }
  if (data.biography !== undefined) {
    identity.biography = data.biography || null;
  }
  if (data.profileImageKey !== undefined) {
    identity.profileImageKey = data.profileImageKey || null;
  }

  identity.updatedAt = now;

  // Also update cached artist info on user's tracks
  for (const tr of serverDb.tracks.values()) {
    if (tr.artistIdentityId === id) {
      tr.artistIdentity = {
        id: identity.id,
        artistName: identity.artistName,
        spotifyUrl: identity.spotifyUrl,
      };
      tr.updatedAt = now;
    }
  }

  return identity;
}

export function deleteArtistIdentity(
  id: string,
  userId: string,
): { success: boolean; message?: string } {
  const identity = serverDb.artistIdentities.get(id);
  if (!identity || identity.deletedAt) {
    return { success: false, message: "Artist Identity not found." };
  }
  // Authorization check: User must own the Artist Identity
  if (identity.userId !== userId) {
    throw new Error("Unauthorized: You do not own this Artist Identity.");
  }

  // Soft delete preserves all historical attribution on tracks, submissions, and queue entries!
  identity.deletedAt = new Date().toISOString();
  identity.updatedAt = new Date().toISOString();

  // If this was the default identity, pick another existing one as default
  if (identity.isDefault) {
    identity.isDefault = false;
    const remaining = getArtistIdentitiesForUser(userId);
    if (remaining.length > 0) {
      const newDefault = serverDb.artistIdentities.get(remaining[0].id);
      if (newDefault) {
        newDefault.isDefault = true;
        newDefault.updatedAt = new Date().toISOString();
      }
    }
  }

  return { success: true, message: "Artist identity removed." };
}

// ============================================================================
// Station Priority Tier Helper Functions
// ============================================================================

export function getStationPriorityTiers(
  stationId: string,
  activeOnly: boolean = false,
): StationPriorityTier[] {
  const tiers: StationPriorityTier[] = [];
  for (const tier of serverDb.stationPriorityTiers.values()) {
    if (tier.stationId === stationId) {
      if (!activeOnly || tier.isActive) {
        tiers.push(tier);
      }
    }
  }

  // If no tiers exist yet for this station, seed initial default tiers
  if (tiers.length === 0) {
    const defaultTier1: StationPriorityTier = {
      id: `tier-${stationId}-priority-jump`,
      stationId,
      name: "Priority Jump",
      description: "Jump ahead of free line submissions directly to the top queue segment.",
      priceCents: 500,
      priorityRank: 1,
      colorSlot: "TIER_COLOR_1",
      isActive: true,
      isUpgradeEnabled: true,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const defaultTier2: StationPriorityTier = {
      id: `tier-${stationId}-vip-review`,
      stationId,
      name: "VIP Instant Review",
      description: "Top priority review with guaranteed full track listen and detailed live feedback.",
      priceCents: 1500,
      priorityRank: 2,
      colorSlot: "TIER_COLOR_2",
      isActive: true,
      isUpgradeEnabled: true,
      sortOrder: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    serverDb.stationPriorityTiers.set(defaultTier1.id, defaultTier1);
    serverDb.stationPriorityTiers.set(defaultTier2.id, defaultTier2);
    tiers.push(defaultTier1, defaultTier2);
  }

  return tiers.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function createStationPriorityTier(
  stationId: string,
  data: CreateStationPriorityTierDto,
): StationPriorityTier {
  const existing = getStationPriorityTiers(stationId, false);
  const now = new Date().toISOString();
  const nextSortOrder = existing.length > 0 ? Math.max(...existing.map((t) => t.sortOrder)) + 1 : 1;

  const newTier: StationPriorityTier = {
    id: `tier-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    stationId,
    name: data.name.trim(),
    description: data.description ? data.description.trim() : null,
    priceCents: data.priceCents,
    priorityRank: data.priorityRank,
    colorSlot: data.colorSlot,
    isActive: data.isActive !== undefined ? data.isActive : true,
    isUpgradeEnabled: data.isUpgradeEnabled !== undefined ? data.isUpgradeEnabled : true,
    sortOrder: nextSortOrder,
    createdAt: now,
    updatedAt: now,
  };

  serverDb.stationPriorityTiers.set(newTier.id, newTier);
  return newTier;
}

export function updateStationPriorityTier(
  tierId: string,
  stationId: string,
  data: UpdateStationPriorityTierDto,
): StationPriorityTier | null {
  const tier = serverDb.stationPriorityTiers.get(tierId);
  if (!tier || tier.stationId !== stationId) {
    return null;
  }

  const now = new Date().toISOString();
  if (data.name !== undefined) tier.name = data.name.trim();
  if (data.description !== undefined) tier.description = data.description ? data.description.trim() : null;
  if (data.priceCents !== undefined) tier.priceCents = data.priceCents;
  if (data.priorityRank !== undefined) tier.priorityRank = data.priorityRank;
  if (data.colorSlot !== undefined) tier.colorSlot = data.colorSlot;
  if (data.isActive !== undefined) tier.isActive = data.isActive;
  if (data.isUpgradeEnabled !== undefined) tier.isUpgradeEnabled = data.isUpgradeEnabled;
  if (data.sortOrder !== undefined) tier.sortOrder = data.sortOrder;

  tier.updatedAt = now;
  serverDb.stationPriorityTiers.set(tier.id, tier);
  return tier;
}

export function deleteStationPriorityTier(
  tierId: string,
  stationId: string,
): boolean {
  const tier = serverDb.stationPriorityTiers.get(tierId);
  if (!tier || tier.stationId !== stationId) {
    return false;
  }
  serverDb.stationPriorityTiers.delete(tierId);
  return true;
}

export function reorderStationPriorityTiers(
  stationId: string,
  tierIds: string[],
): StationPriorityTier[] {
  tierIds.forEach((id, index) => {
    const tier = serverDb.stationPriorityTiers.get(id);
    if (tier && tier.stationId === stationId) {
      tier.sortOrder = index + 1;
      tier.updatedAt = new Date().toISOString();
      serverDb.stationPriorityTiers.set(id, tier);
    }
  });

  return getStationPriorityTiers(stationId, false);
}

// ============================================================================
// Live Session Queue Management Helper Functions
// ============================================================================

export function isSessionAuthorizedHost(userId: string, sessionId: string): boolean {
  const user = serverDb.users.get(userId);
  if (!user) return false;
  if (user.roles.includes(Role.OWNER_ADMIN)) return true;

  const session = serverDb.sessions.get(sessionId);
  if (!session) return false;

  const station = serverDb.stations.get(session.stationId);
  if (!station) return false;

  let hostProfile = null;
  for (const hp of serverDb.hostProfiles.values()) {
    if (hp.userId === userId) {
      hostProfile = hp;
      break;
    }
  }

  return Boolean(hostProfile && station.hostId === hostProfile.id);
}

// Helper to qualify and displace current player track
function qualifyAndDisplaceCurrentPlayer(
  session: StoredSession,
  queue: StoredQueueEntry[],
): void {
  if (!session.currentQueueEntryId) return;
  const currentEntry = queue.find((e) => e.id === session.currentQueueEntryId);
  if (!currentEntry || currentEntry.status !== QueueStatus.PLAYING) return;

  const loadedAt = currentEntry.loadedIntoPlayerAt
    ? new Date(currentEntry.loadedIntoPlayerAt).getTime()
    : 0;
  // External link / loaded playback qualification: continuous loaded >= 120,000 ms (2 minutes)
  const isQualified = loadedAt > 0 && Date.now() - loadedAt >= 120000;

  if (isQualified) {
    currentEntry.status = QueueStatus.COMPLETED;
    currentEntry.completedAt = new Date().toISOString();
    currentEntry.wasPlayed = true;
    currentEntry.playbackCompleted = true;
    currentEntry.loadedIntoPlayerAt = null;
    currentEntry.originPriorityRank = undefined;
    currentEntry.originSortOrder = undefined;

    const sub = serverDb.submissions.get(currentEntry.submissionId);
    if (sub) {
      sub.currentQueueStatus = QueueStatus.COMPLETED;
    }
    const track = serverDb.tracks.get(currentEntry.sourceTrackId);
    if (track) {
      track.lastPlayedAt = new Date().toISOString();
    }

    recordPlaybackEvent({
      liveSessionId: session.id,
      stationId: session.stationId,
      queueEntryId: currentEntry.id,
      submissionId: currentEntry.submissionId,
      trackId: currentEntry.sourceTrackId,
      songName: currentEntry.songName,
      artistName: currentEntry.artistName,
      isPriority: !!currentEntry.isPriority,
      artistIdentityId: currentEntry.artistIdentityId,
      spotifyUrl: currentEntry.spotifyUrl,
      eventType: "QUALIFIED_PLAY",
      timestamp: currentEntry.completedAt,
    });
  } else {
    // Restore near origin position
    currentEntry.status = QueueStatus.QUEUED;
    if (currentEntry.originPriorityRank !== undefined) {
      currentEntry.priorityRank = currentEntry.originPriorityRank;
    }
    if (currentEntry.originSortOrder !== undefined) {
      currentEntry.sortOrder = currentEntry.originSortOrder;
    }
    currentEntry.loadedIntoPlayerAt = null;
    currentEntry.originPriorityRank = undefined;
    currentEntry.originSortOrder = undefined;

    const sub = serverDb.submissions.get(currentEntry.submissionId);
    if (sub) {
      sub.currentQueueStatus = QueueStatus.QUEUED;
    }
  }
}

// Transactional invariant: at most ONE entry can have status PLAYING
function enforceOnePlayingEntryInvariant(
  queue: StoredQueueEntry[],
  activeEntryId: string | null,
): void {
  for (const entry of queue) {
    if (entry.id !== activeEntryId && entry.status === QueueStatus.PLAYING) {
      entry.status = QueueStatus.QUEUED;
      entry.loadedIntoPlayerAt = null;
    }
  }
}

export function playNextTrack(sessionId: string): {
  success: boolean;
  currentTrack: any;
  currentQueueEntryId: string | null;
} {
  const session = serverDb.sessions.get(sessionId);
  if (!session) {
    throw new Error("Live session not found");
  }

  const queue = serverDb.queues.get(sessionId) || [];

  // 1. Authoritatively qualify and displace currently loaded track
  qualifyAndDisplaceCurrentPlayer(session, queue);

  // 2. Select next entry: NEXT first, then highest priority QUEUED
  let nextEntry = queue.find((e) => e.status === QueueStatus.NEXT);
  if (!nextEntry) {
    const queuedItems = queue
      .filter((e) => e.status === QueueStatus.QUEUED)
      .sort((a, b) => {
        if (b.priorityRank !== a.priorityRank) {
          return b.priorityRank - a.priorityRank;
        }
        return a.sortOrder - b.sortOrder;
      });
    nextEntry = queuedItems[0];
  }

  if (nextEntry) {
    nextEntry.originPriorityRank = nextEntry.priorityRank;
    nextEntry.originSortOrder = nextEntry.sortOrder;
    nextEntry.loadedIntoPlayerAt = new Date().toISOString();
    nextEntry.status = QueueStatus.PLAYING;

    session.currentQueueEntryId = nextEntry.id;
    session.currentTrack = {
      songName: nextEntry.songName,
      artistName: nextEntry.artistName,
      durationSeconds: nextEntry.durationSeconds,
      spotifyUrl: nextEntry.spotifyUrl || undefined,
      artistIdentityId: nextEntry.artistIdentityId || undefined,
    };
    session.lastPlaybackActivityAt = new Date().toISOString();

    const sub = serverDb.submissions.get(nextEntry.submissionId);
    if (sub) {
      sub.currentQueueStatus = QueueStatus.PLAYING;
    }
    const track = serverDb.tracks.get(nextEntry.sourceTrackId);
    if (track) {
      track.lastPlayedAt = new Date().toISOString();
    }

    enforceOnePlayingEntryInvariant(queue, nextEntry.id);
  } else {
    session.currentQueueEntryId = null;
    session.currentTrack = null;
    enforceOnePlayingEntryInvariant(queue, null);
  }

  session.queueRevision = (session.queueRevision || 0) + 1;
  serverDb.queues.set(sessionId, queue);

  return {
    success: true,
    currentTrack: session.currentTrack,
    currentQueueEntryId: session.currentQueueEntryId,
  };
}

export function loadQueueEntry(
  sessionId: string,
  entryId: string,
): { success: boolean; currentTrack: any } {
  const session = serverDb.sessions.get(sessionId);
  if (!session) {
    throw new Error("Live session not found");
  }

  const queue = serverDb.queues.get(sessionId) || [];
  const targetEntry = queue.find((e) => e.id === entryId);
  if (!targetEntry) {
    throw new Error("Queue entry not found");
  }

  // 1. Authoritatively qualify and displace current loaded track if different
  if (session.currentQueueEntryId && session.currentQueueEntryId !== entryId) {
    qualifyAndDisplaceCurrentPlayer(session, queue);
  }

  // 2. Load target entry
  targetEntry.originPriorityRank = targetEntry.priorityRank;
  targetEntry.originSortOrder = targetEntry.sortOrder;
  targetEntry.loadedIntoPlayerAt = new Date().toISOString();
  targetEntry.status = QueueStatus.PLAYING;

  session.currentQueueEntryId = targetEntry.id;
  session.currentTrack = {
    songName: targetEntry.songName,
    artistName: targetEntry.artistName,
    durationSeconds: targetEntry.durationSeconds,
    spotifyUrl: targetEntry.spotifyUrl || undefined,
    artistIdentityId: targetEntry.artistIdentityId || undefined,
  };
  session.lastPlaybackActivityAt = new Date().toISOString();

  const sub = serverDb.submissions.get(targetEntry.submissionId);
  if (sub) {
    sub.currentQueueStatus = QueueStatus.PLAYING;
  }
  const track = serverDb.tracks.get(targetEntry.sourceTrackId);
  if (track) {
    track.lastPlayedAt = new Date().toISOString();
  }

  enforceOnePlayingEntryInvariant(queue, targetEntry.id);

  session.queueRevision = (session.queueRevision || 0) + 1;
  serverDb.queues.set(sessionId, queue);

  return {
    success: true,
    currentTrack: session.currentTrack,
  };
}

// Clear Now Playing: MUST restore current track to QUEUED without completing or moving to history
export function clearSessionPlayer(sessionId: string): { success: boolean } {
  const session = serverDb.sessions.get(sessionId);
  if (!session) {
    throw new Error("Live session not found");
  }

  const queue = serverDb.queues.get(sessionId) || [];
  if (session.currentQueueEntryId) {
    const currentEntry = queue.find((e) => e.id === session.currentQueueEntryId);
    if (currentEntry && currentEntry.status === QueueStatus.PLAYING) {
      // Restore near origin - do NOT mark completed, do NOT move to history!
      currentEntry.status = QueueStatus.QUEUED;
      if (currentEntry.originPriorityRank !== undefined) {
        currentEntry.priorityRank = currentEntry.originPriorityRank;
      }
      if (currentEntry.originSortOrder !== undefined) {
        currentEntry.sortOrder = currentEntry.originSortOrder;
      }
      currentEntry.loadedIntoPlayerAt = null;
      currentEntry.originPriorityRank = undefined;
      currentEntry.originSortOrder = undefined;

      const sub = serverDb.submissions.get(currentEntry.submissionId);
      if (sub) {
        sub.currentQueueStatus = QueueStatus.QUEUED;
      }
    }
  }

  enforceOnePlayingEntryInvariant(queue, null);

  session.currentQueueEntryId = null;
  session.currentTrack = null;
  session.queueRevision = (session.queueRevision || 0) + 1;
  serverDb.queues.set(sessionId, queue);

  return { success: true };
}

export function moveEntryToNext(
  sessionId: string,
  entryId: string,
): { success: boolean } {
  const session = serverDb.sessions.get(sessionId);
  if (!session) {
    throw new Error("Live session not found");
  }

  const queue = serverDb.queues.get(sessionId) || [];
  const target = queue.find((e) => e.id === entryId);
  if (!target) {
    throw new Error("Queue entry not found");
  }

  // Clear any existing NEXT entry back to QUEUED
  for (const item of queue) {
    if (item.status === QueueStatus.NEXT && item.id !== entryId) {
      item.status = QueueStatus.QUEUED;
    }
  }

  target.status = QueueStatus.NEXT;
  session.queueRevision = (session.queueRevision || 0) + 1;
  serverDb.queues.set(sessionId, queue);

  return { success: true };
}

export function completeQueueEntry(
  sessionId: string,
  entryId: string,
): { success: boolean } {
  const session = serverDb.sessions.get(sessionId);
  if (!session) {
    throw new Error("Live session not found");
  }

  const queue = serverDb.queues.get(sessionId) || [];
  const target = queue.find((e) => e.id === entryId);
  if (!target) {
    throw new Error("Queue entry not found");
  }

  target.status = QueueStatus.COMPLETED;
  target.completedAt = new Date().toISOString();
  target.wasPlayed = true;
  target.playbackCompleted = true;
  target.loadedIntoPlayerAt = null;
  target.originPriorityRank = undefined;
  target.originSortOrder = undefined;

  const sub = serverDb.submissions.get(target.submissionId);
  if (sub) {
    sub.currentQueueStatus = QueueStatus.COMPLETED;
  }
  const track = serverDb.tracks.get(target.sourceTrackId);
  if (track) {
    track.lastPlayedAt = new Date().toISOString();
  }

  if (session.currentQueueEntryId === entryId) {
    session.currentQueueEntryId = null;
    session.currentTrack = null;
  }

  recordPlaybackEvent({
    liveSessionId: session.id,
    stationId: session.stationId,
    queueEntryId: target.id,
    submissionId: target.submissionId,
    trackId: target.sourceTrackId,
    songName: target.songName,
    artistName: target.artistName,
    isPriority: !!target.isPriority,
    artistIdentityId: target.artistIdentityId,
    spotifyUrl: target.spotifyUrl,
    eventType: "QUALIFIED_PLAY",
    timestamp: target.completedAt,
  });

  session.queueRevision = (session.queueRevision || 0) + 1;
  serverDb.queues.set(sessionId, queue);

  return { success: true };
}

export function removeOrSkipQueueEntry(
  sessionId: string,
  entryId: string,
  reason: "SKIPPED" | "REMOVED" = "SKIPPED",
): { success: boolean } {
  const session = serverDb.sessions.get(sessionId);
  if (!session) {
    throw new Error("Live session not found");
  }

  const queue = serverDb.queues.get(sessionId) || [];
  const target = queue.find((e) => e.id === entryId);
  if (!target) {
    throw new Error("Queue entry not found");
  }

  target.status = reason === "REMOVED" ? QueueStatus.REMOVED : QueueStatus.SKIPPED;
  if (reason === "SKIPPED") {
    target.skippedAt = new Date().toISOString();
  } else {
    target.removedAt = new Date().toISOString();
  }
  target.loadedIntoPlayerAt = null;

  const sub = serverDb.submissions.get(target.submissionId);
  if (sub) {
    sub.currentQueueStatus = target.status;
  }

  if (session.currentQueueEntryId === entryId) {
    session.currentQueueEntryId = null;
    session.currentTrack = null;
  }

  session.queueRevision = (session.queueRevision || 0) + 1;
  serverDb.queues.set(sessionId, queue);

  return { success: true };
}

// ============================================================================
// Authoritative Playback Events & Weekly Top 3 Ranking
// ============================================================================

export function recordPlaybackEvent(
  data: Omit<StoredPlaybackEvent, "id"> & { id?: string },
): StoredPlaybackEvent {
  if (!serverDb.playbackEvents) {
    serverDb.playbackEvents = [];
  }
  // Idempotency: avoid recording duplicate qualification events for the same queueEntryId
  const existing = serverDb.playbackEvents.find(
    (e) =>
      e.queueEntryId === data.queueEntryId &&
      (e.eventType === "QUALIFIED_PLAY" || e.eventType === "COMPLETE"),
  );
  if (
    existing &&
    (data.eventType === "QUALIFIED_PLAY" || data.eventType === "COMPLETE")
  ) {
    return existing;
  }

  const event: StoredPlaybackEvent = {
    id:
      data.id ||
      `pbe-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    ...data,
  };
  serverDb.playbackEvents.push(event);
  return event;
}

export function getStationWeeklyTop3(
  stationIdOrSlugOrHostname: string,
  referenceDate: Date = new Date(),
): WeeklyTop3Response {
  // 1. Resolve station
  let station: StoredStation | undefined;
  const lookup = (stationIdOrSlugOrHostname || "").toLowerCase().trim();

  // Try direct ID
  station = serverDb.stations.get(stationIdOrSlugOrHostname);
  if (!station) {
    // Try slug or vanityHostname
    for (const st of serverDb.stations.values()) {
      const hostProfile = st.hostId ? serverDb.hostProfiles.get(st.hostId) : undefined;
      if (
        st.id === stationIdOrSlugOrHostname ||
        st.slug?.toLowerCase() === lookup ||
        hostProfile?.hostSlug?.toLowerCase() === lookup ||
        hostProfile?.normalizedHostSlug?.toLowerCase() === lookup ||
        (st as any).vanityHostname?.toLowerCase() === lookup
      ) {
        station = st;
        break;
      }
    }
  }

  if (!station) {
    throw new Error("Station not found");
  }

  // Resolve Host Display Name
  let hostName = station.stationName;
  if (station.hostId) {
    const hostProfile = serverDb.hostProfiles.get(station.hostId);
    if (hostProfile?.userId) {
      const user = serverDb.users.get(hostProfile.userId);
      if (user?.displayName) {
        hostName = user.displayName;
      }
    }
  }

  // 2. Server-authoritative Weekly Period
  const period = getCurrentWeeklyPeriod(referenceDate);
  const periodStartMs = period.startDate.getTime();
  const periodEndMs = period.endDate.getTime();

  // 3. Ensure live playing track is evaluated if it has reached 120s continuous playback qualification
  for (const session of serverDb.sessions.values()) {
    if (
      session.stationId === station.id &&
      session.status === LiveSessionStatus.LIVE &&
      session.currentQueueEntryId
    ) {
      const queue = serverDb.queues.get(session.id) || [];
      const currentEntry = queue.find((e) => e.id === session.currentQueueEntryId);
      if (
        currentEntry &&
        currentEntry.status === QueueStatus.PLAYING &&
        currentEntry.loadedIntoPlayerAt
      ) {
        const loadedTime = new Date(currentEntry.loadedIntoPlayerAt).getTime();
        if (
          loadedTime > 0 &&
          Date.now() - loadedTime >= QUALIFICATION_CONTINUOUS_PLAYBACK_MS
        ) {
          recordPlaybackEvent({
            liveSessionId: session.id,
            stationId: station.id,
            queueEntryId: currentEntry.id,
            submissionId: currentEntry.submissionId,
            trackId: currentEntry.sourceTrackId,
            songName: currentEntry.songName,
            artistName: currentEntry.artistName,
            isPriority: !!currentEntry.isPriority,
            artistIdentityId: currentEntry.artistIdentityId,
            spotifyUrl: currentEntry.spotifyUrl,
            eventType: "QUALIFIED_PLAY",
            timestamp: new Date(
              loadedTime + QUALIFICATION_CONTINUOUS_PLAYBACK_MS,
            ).toISOString(),
          });
        }
      }
    }
  }

  if (!serverDb.playbackEvents) {
    serverDb.playbackEvents = [];
  }

  // Also harvest any historical completed queue entries that were played in this station
  // to ensure backwards compatibility with pre-existing completed entries
  for (const session of serverDb.sessions.values()) {
    if (session.stationId === station.id) {
      const queue = serverDb.queues.get(session.id) || [];
      for (const entry of queue) {
        if (entry.wasPlayed && entry.completedAt) {
          const completedMs = new Date(entry.completedAt).getTime();
          if (completedMs >= periodStartMs && completedMs < periodEndMs) {
            recordPlaybackEvent({
              liveSessionId: session.id,
              stationId: station.id,
              queueEntryId: entry.id,
              submissionId: entry.submissionId,
              trackId: entry.sourceTrackId,
              songName: entry.songName,
              artistName: entry.artistName,
              isPriority: !!entry.isPriority,
              artistIdentityId: entry.artistIdentityId,
              spotifyUrl: entry.spotifyUrl,
              eventType: "QUALIFIED_PLAY",
              timestamp: entry.completedAt,
            });
          }
        }
      }
    }
  }

  const stationEvents = serverDb.playbackEvents.filter((e) => {
    if (e.stationId !== station!.id) return false;
    if (e.eventType !== "QUALIFIED_PLAY" && e.eventType !== "COMPLETE") return false;
    const timeMs = new Date(e.timestamp).getTime();
    return timeMs >= periodStartMs && timeMs < periodEndMs;
  });

  // 5. Group by track identifier
  const trackGroups = new Map<string, StoredPlaybackEvent[]>();
  for (const ev of stationEvents) {
    const key =
      ev.trackId ||
      `${ev.songName.trim().toLowerCase()}___${ev.artistName.trim().toLowerCase()}`;
    const group = trackGroups.get(key) || [];
    group.push(ev);
    trackGroups.set(key, group);
  }

  // 6. Aggregate each track with 4-hour rate limit for normal plays and immediate count for paid priority
  interface TrackAggregate {
    trackId: string;
    songName: string;
    artistName: string;
    qualifyingPlayCount: number;
    lastQualifyingPlayAt?: string;
    spotifyUrl?: string | null;
    artistIdentityId?: string | null;
  }

  const aggregates: TrackAggregate[] = [];

  for (const [key, evs] of trackGroups.entries()) {
    // Sort events strictly chronologically ascending
    evs.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    let qualifyingPlayCount = 0;
    let lastQualifyingPlayAt: string | undefined = undefined;
    let lastCountedNormalPlayTime = -Infinity;

    for (const ev of evs) {
      const evTime = new Date(ev.timestamp).getTime();
      if (ev.isPriority) {
        // Paid priority plays count immediately upon qualification!
        qualifyingPlayCount++;
        lastQualifyingPlayAt = ev.timestamp;
      } else {
        // Normal play: counts at most once every 4 hours per Host/Station
        if (evTime - lastCountedNormalPlayTime >= NORMAL_PLAY_RATE_LIMIT_MS) {
          qualifyingPlayCount++;
          lastQualifyingPlayAt = ev.timestamp;
          lastCountedNormalPlayTime = evTime;
        }
      }
    }

    if (qualifyingPlayCount > 0) {
      const latestEv = evs[evs.length - 1];
      const trackId = latestEv.trackId || key;
      const songName = latestEv.songName;
      const artistName = latestEv.artistName;

      // Check ArtistIdentity & Spotify Link (Requirement 10)
      let spotifyUrl: string | null = null;
      let artistIdentityId: string | null = null;

      for (const ev of evs) {
        if (ev.artistIdentityId) {
          const artist = serverDb.artistIdentities.get(ev.artistIdentityId);
          if (artist && !(artist as any).deletedAt) {
            artistIdentityId = artist.id;
            if (artist.spotifyUrl && artist.spotifyUrl.trim().length > 0) {
              spotifyUrl = artist.spotifyUrl;
            }
            break;
          }
        }
      }

      aggregates.push({
        trackId,
        songName,
        artistName,
        qualifyingPlayCount,
        lastQualifyingPlayAt,
        spotifyUrl,
        artistIdentityId,
      });
    }
  }

  // 7. Deterministic tie-breaking:
  // 1. qualifying play count DESC
  // 2. most recent qualifying play DESC
  // 3. stable song/track identifier ASC
  aggregates.sort((a, b) => {
    if (b.qualifyingPlayCount !== a.qualifyingPlayCount) {
      return b.qualifyingPlayCount - a.qualifyingPlayCount;
    }
    const timeA = a.lastQualifyingPlayAt
      ? new Date(a.lastQualifyingPlayAt).getTime()
      : 0;
    const timeB = b.lastQualifyingPlayAt
      ? new Date(b.lastQualifyingPlayAt).getTime()
      : 0;
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    const idA = a.trackId || a.songName;
    const idB = b.trackId || b.songName;
    return idA.localeCompare(idB);
  });

  // 8. Slice Top 3 (or fewer if fewer exist)
  const top3Items: WeeklyTop3Item[] = aggregates.slice(0, 3).map((item, index) => ({
    rank: index + 1,
    trackId: item.trackId,
    songName: item.songName,
    artistName: item.artistName,
    qualifyingPlayCount: item.qualifyingPlayCount,
    lastQualifyingPlayAt: item.lastQualifyingPlayAt,
    spotifyUrl: item.spotifyUrl,
    artistIdentityId: item.artistIdentityId,
  }));

  return {
    stationId: station.id,
    stationName: station.stationName,
    hostName,
    period: {
      start: period.startIso,
      end: period.endIso,
      timeZone: "America/New_York",
      formattedRange: period.formattedRange,
      periodKey: period.periodKey,
    },
    items: top3Items,
  };
}

export function getSessionWeeklyTop3(
  sessionId: string,
  referenceDate: Date = new Date(),
): WeeklyTop3Response {
  const session = serverDb.sessions.get(sessionId);
  if (!session) {
    throw new Error("Live session not found");
  }
  return getStationWeeklyTop3(session.stationId, referenceDate);
}

