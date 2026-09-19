-- CreateEnums
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PENDING_EMAIL_VERIFICATION', 'SUSPENDED', 'BANNED', 'DEACTIVATED', 'DELETION_PENDING');
CREATE TYPE "TrackSourceType" AS ENUM ('UPLOADED_AUDIO', 'YOUTUBE', 'SOUNDCLOUD', 'SPOTIFY', 'BANDCAMP', 'DIRECT_AUDIO_URL', 'OTHER_EXTERNAL');
CREATE TYPE "PlaybackCapability" AS ENUM ('NATIVE_AUDIO', 'EMBEDDED_PLAYER', 'EXTERNAL_ONLY', 'UNSUPPORTED');
CREATE TYPE "ProcessingState" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "HostApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED', 'PAYMENT_VERIFICATION_REQUIRED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVOKED', 'WITHDRAWN');
CREATE TYPE "StreamingPlatform" AS ENUM ('KICK', 'YOUTUBE', 'TIKTOK', 'FACEBOOK', 'TWITCH');
CREATE TYPE "PayoutProvider" AS ENUM ('STRIPE');
CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'PREPARING', 'LIVE', 'PAUSED', 'ENDING', 'ENDED', 'CANCELLED');
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED', 'RELEASED', 'CANCELLED');
CREATE TYPE "QueueStatus" AS ENUM ('AWAITING_PAYMENT', 'QUEUED', 'NEXT', 'PLAYING', 'PAUSED', 'COMPLETED', 'SKIPPED', 'REJECTED', 'REMOVED', 'CARRIED_OVER', 'REFUND_PENDING', 'REFUNDED', 'EXPIRED', 'MOVED_TO_HISTORY');
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'REQUIRES_ACTION', 'AUTHORIZED', 'CAPTURED', 'SETTLED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED', 'CHARGEBACK');
CREATE TYPE "HostEarningStatus" AS ENUM ('PAYMENT_PENDING', 'ALLOCATED_TO_STRIPE', 'REVERSED', 'REFUNDED', 'DISPUTED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'PAID', 'FAILED', 'CANCELLED');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ACTIONED', 'DISMISSED', 'APPEALED', 'CLOSED');
CREATE TYPE "BanScope" AS ENUM ('ACCOUNT', 'HOST_PRIVILEGES', 'SUBMISSIONS', 'PAYMENTS', 'PAYOUTS', 'CONTENT_UPLOAD', 'IP', 'NETWORK', 'DEVICE_RISK', 'FULL_PLATFORM');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "StripePlatformMode" AS ENUM ('TEST', 'LIVE');
CREATE TYPE "PaymentEmergencyState" AS ENUM ('PAYMENTS_ENABLED', 'PAYMENTS_PAUSED', 'PAYMENTS_DISABLED');
CREATE TYPE "QueueBatchOperationType" AS ENUM ('MOVE_TO_HISTORY', 'REINSERT_TO_QUEUE', 'REMOVE_FROM_ACTIVE_QUEUE');
CREATE TYPE "TierColorSlot" AS ENUM ('FREE_LINE', 'TIER_COLOR_1', 'TIER_COLOR_2', 'TIER_COLOR_3', 'TIER_COLOR_4', 'TIER_COLOR_5', 'TIER_COLOR_6', 'TIER_COLOR_7', 'TIER_COLOR_8', 'TIER_COLOR_9', 'TIER_COLOR_10');
CREATE TYPE "StationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable: users
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "normalizedUsername" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "deletionRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_profiles
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "biography" TEXT,
    "profileImageKey" TEXT,
    "bannerImageKey" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_role_assignments
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_permission_assignments
CREATE TABLE "user_permission_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "permission" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permission_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_preferences
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_security_events
CREATE TABLE "user_security_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_sessions
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceLabel" TEXT,
    "isElevated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idleExpiresAt" TIMESTAMP(3) NOT NULL,
    "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: email_verification_token_records
CREATE TABLE "email_verification_token_records" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_token_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: password_reset_token_records
CREATE TABLE "password_reset_token_records" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: authentication_attempts
CREATE TABLE "authentication_attempts" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "wasSuccessful" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authentication_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: admin_invitations
CREATE TABLE "admin_invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "invitedUserId" UUID,
    "intendedRole" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: admin_role_changes
CREATE TABLE "admin_role_changes" (
    "id" UUID NOT NULL,
    "actingAdminUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "previousRole" TEXT NOT NULL,
    "newRole" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestId" TEXT,
    "sessionId" UUID,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_role_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: legal_documents
CREATE TABLE "legal_documents" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: legal_document_versions
CREATE TABLE "legal_document_versions" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionString" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: legal_acceptances
CREATE TABLE "legal_acceptances" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "acceptanceSource" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable: artist_identities
CREATE TABLE "artist_identities" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "artistName" TEXT NOT NULL,
    "normalizedArtistName" TEXT NOT NULL,
    "biography" TEXT,
    "profileImageKey" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "artist_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tracks
CREATE TABLE "tracks" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "artistIdentityId" UUID NOT NULL,
    "songName" TEXT NOT NULL,
    "normalizedSongName" TEXT NOT NULL,
    "albumName" TEXT,
    "explicitContent" BOOLEAN NOT NULL DEFAULT false,
    "releaseDate" TIMESTAMP(3),
    "notesForHosts" TEXT,
    "sourceType" "TrackSourceType" NOT NULL,
    "playbackCapability" "PlaybackCapability" NOT NULL,
    "processingState" "ProcessingState" NOT NULL DEFAULT 'PENDING',
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: track_media_versions
CREATE TABLE "track_media_versions" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "originalS3Key" TEXT NOT NULL,
    "processedS3Key" TEXT,
    "mimeType" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "audioCodec" TEXT,
    "bitrateBps" INTEGER,
    "sampleRateHz" INTEGER,
    "channelCount" INTEGER,
    "processingState" "ProcessingState" NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_media_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: track_artworks
CREATE TABLE "track_artworks" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "originalS3Key" TEXT NOT NULL,
    "masterS3Key" TEXT,
    "thumbnailS3Key" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "blurHash" TEXT,
    "dominantColor" VARCHAR(7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_artworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: track_external_sources
CREATE TABLE "track_external_sources" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "metaPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_external_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable: genres
CREATE TABLE "genres" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable: track_genres
CREATE TABLE "track_genres" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "genreId" UUID NOT NULL,

    CONSTRAINT "track_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable: track_credits
CREATE TABLE "track_credits" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "creditName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable: host_applications
CREATE TABLE "host_applications" (
    "id" UUID NOT NULL,
    "applicantUserId" UUID NOT NULL,
    "publicHostName" TEXT NOT NULL,
    "normalizedHostName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "primaryStreamingPlatform" TEXT NOT NULL,
    "primaryStreamingProfileUrl" TEXT NOT NULL,
    "hostTermsAcceptanceId" UUID,
    "payoutOnboardingStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "status" "HostApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "biography" TEXT,
    "phoneNumber" TEXT,
    "expectedStreamingFrequency" TEXT,
    "acceptedGenres" TEXT,
    "exampleLivestreamLinks" TEXT,
    "additionalNotes" TEXT,
    "profileImageKey" TEXT,
    "bannerImageKey" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "host_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: host_application_platforms
CREATE TABLE "host_application_platforms" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "followerCount" INTEGER DEFAULT 0,

    CONSTRAINT "host_application_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable: host_application_status_history
CREATE TABLE "host_application_status_history" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "previousStatus" "HostApplicationStatus",
    "newStatus" "HostApplicationStatus" NOT NULL,
    "changedByUserId" UUID,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "host_application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: host_application_reviews
CREATE TABLE "host_application_reviews" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "reviewerUserId" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "internalNotes" TEXT,
    "userVisibleNotes" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "host_application_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable: host_profiles
CREATE TABLE "host_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "publicHostName" TEXT NOT NULL,
    "normalizedHostName" TEXT NOT NULL,
    "biography" TEXT,
    "profileImageKey" TEXT,
    "bannerImageKey" TEXT,
    "country" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "isPublicVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    -- Public host page slug support
    "hostSlug" TEXT NOT NULL,
    "normalizedHostSlug" TEXT NOT NULL,
    "publicPageEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "host_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: host_slug_histories
CREATE TABLE "host_slug_histories" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "previousSlug" TEXT NOT NULL,
    "previousNormalizedSlug" TEXT NOT NULL,
    "newSlug" TEXT NOT NULL,
    "newNormalizedSlug" TEXT NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redirectEnabled" BOOLEAN NOT NULL DEFAULT true,
    "redirectExpiresAt" TIMESTAMP(3),

    CONSTRAINT "host_slug_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: host_social_accounts
CREATE TABLE "host_social_accounts" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "platform" "StreamingPlatform" NOT NULL,
    "username" TEXT NOT NULL,
    "normalizedUsername" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "host_social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: host_payout_accounts
CREATE TABLE "host_payout_accounts" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "provider" "PayoutProvider" NOT NULL DEFAULT 'STRIPE',
    "providerAccountId" TEXT NOT NULL,
    "providerMerchantId" TEXT,
    "country" TEXT NOT NULL,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "onboardingState" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "isIdentityVerified" BOOLEAN NOT NULL DEFAULT false,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "host_payout_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: stations
CREATE TABLE "stations" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "stationName" TEXT NOT NULL,
    "normalizedStationName" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "profileImageKey" TEXT,
    "bannerImageKey" TEXT,
    "isPublicVisible" BOOLEAN NOT NULL DEFAULT true,
    "acceptedContentRules" TEXT,
    "explicitContentAllowed" BOOLEAN NOT NULL DEFAULT true,
    "maxTrackDurationSeconds" INTEGER NOT NULL DEFAULT 600,
    "maxQueueSize" INTEGER NOT NULL DEFAULT 100,
    "repeatsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "duplicateTracksAllowed" BOOLEAN NOT NULL DEFAULT false,
    "queuePositionsVisible" BOOLEAN NOT NULL DEFAULT true,
    "waitTimeVisible" BOOLEAN NOT NULL DEFAULT true,
    "defaultEndLiveHandling" TEXT NOT NULL DEFAULT 'CLOSE_SUBMISSIONS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    -- Station Lifecycle status fields
    "status" "StationStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    -- Public Queue Visibility settings
    "publicQueueVisibilityMode" TEXT NOT NULL DEFAULT 'SHOW_FULL_TRACK_INFORMATION',
    "showArtworkPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showArtistNamePublicly" BOOLEAN NOT NULL DEFAULT true,
    "showSongNamePublicly" BOOLEAN NOT NULL DEFAULT true,
    "showTierPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showQueuePositionPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showCurrentTrackPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showRecentlyPlayedPublicly" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: station_genres
CREATE TABLE "station_genres" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "genreId" UUID NOT NULL,

    CONSTRAINT "station_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable: station_settings
CREATE TABLE "station_settings" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "station_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: station_blocked_users
CREATE TABLE "station_blocked_users" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "blockedUserId" UUID NOT NULL,
    "reason" TEXT,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "station_blocked_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: live_sessions
CREATE TABLE "live_sessions" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "status" "LiveSessionStatus" NOT NULL DEFAULT 'PREPARING',
    "liveTitle" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "submissionsOpen" BOOLEAN NOT NULL DEFAULT false,
    "freeLineOpen" BOOLEAN NOT NULL DEFAULT false,
    "paidSubmissionsOpen" BOOLEAN NOT NULL DEFAULT false,
    "currentQueueSequence" INTEGER NOT NULL DEFAULT 0,
    "currentQueueEntryId" UUID,
    "currentTrackId" UUID,
    "primaryStreamingPlatform" "StreamingPlatform" NOT NULL,
    "savedProfileUrlSnapshot" TEXT NOT NULL,
    "sessionLiveUrl" TEXT,
    "linkSource" TEXT DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    -- Real-time sequencing
    "queueRevision" INTEGER NOT NULL DEFAULT 0,
    "publicQueueUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: live_session_platforms
CREATE TABLE "live_session_platforms" (
    "id" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "platform" "StreamingPlatform" NOT NULL,
    "streamUrl" TEXT NOT NULL,

    CONSTRAINT "live_session_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable: live_session_snapshots
CREATE TABLE "live_session_snapshots" (
    "id" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "maxTrackDurationSeconds" INTEGER NOT NULL,
    "maxQueueSize" INTEGER NOT NULL,
    "repeatsAllowed" BOOLEAN NOT NULL,
    "duplicateTracksAllowed" BOOLEAN NOT NULL,
    "queuePositionsVisible" BOOLEAN NOT NULL,
    "waitTimeVisible" BOOLEAN NOT NULL,
    "explicitContentAllowed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Public Queue Visibility settings (Snapshot)
    "publicQueueVisibilityMode" TEXT NOT NULL DEFAULT 'SHOW_FULL_TRACK_INFORMATION',
    "showArtworkPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showArtistNamePublicly" BOOLEAN NOT NULL DEFAULT true,
    "showSongNamePublicly" BOOLEAN NOT NULL DEFAULT true,
    "showTierPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showQueuePositionPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showCurrentTrackPublicly" BOOLEAN NOT NULL DEFAULT true,
    "showRecentlyPlayedPublicly" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "live_session_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: live_session_status_history
CREATE TABLE "live_session_status_history" (
    "id" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "previousStatus" "LiveSessionStatus",
    "newStatus" "LiveSessionStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_session_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: free_line_configurations
CREATE TABLE "free_line_configurations" (
    "id" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxFreeSubmissionsPerUser" INTEGER NOT NULL DEFAULT 1,
    "totalFreeCapacityLimit" INTEGER,
    "activeEntryCapacityLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_line_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: live_free_line_snapshots
CREATE TABLE "live_free_line_snapshots" (
    "id" UUID NOT NULL,
    "configurationId" UUID NOT NULL,
    "maxFreeSubmissionsPerUser" INTEGER NOT NULL,
    "totalFreeCapacityLimit" INTEGER,
    "activeEntryCapacityLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_free_line_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_live_submission_usages
CREATE TABLE "user_live_submission_usages" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "freeUsedCount" INTEGER NOT NULL DEFAULT 0,
    "paidUsedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_live_submission_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: priority_tiers
CREATE TABLE "priority_tiers" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priorityRank" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isUpgradeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxPurchasesPerLive" INTEGER,
    "maxPurchasesPerUserPerLive" INTEGER,
    "maxSimultaneousActiveEntries" INTEGER,
    "refundPolicyNotes" TEXT,
    "visualMetadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    -- Fixed Color slots and visibility settings
    "colorSlot" "TierColorSlot" NOT NULL DEFAULT 'TIER_COLOR_10',
    "publicVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "priority_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: live_priority_tier_snapshots
CREATE TABLE "live_priority_tier_snapshots" (
    "id" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "priorityTierId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priorityRank" INTEGER NOT NULL,
    "isUpgradeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxPurchasesPerLive" INTEGER,
    "maxPurchasesPerUserPerLive" INTEGER,
    "maxSimultaneousActiveEntries" INTEGER,
    "refundPolicyNotes" TEXT,
    "visualMetadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Snapshotted color slots
    "colorSlot" "TierColorSlot" NOT NULL DEFAULT 'TIER_COLOR_10',
    "publicVisible" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "live_priority_tier_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: priority_tier_reservations
CREATE TABLE "priority_tier_reservations" (
    "id" UUID NOT NULL,
    "tierSnapshotId" UUID NOT NULL,
    "priorityTierId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "trackId" UUID,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paymentAttemptId" UUID,
    "releasedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "priority_tier_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: submissions
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "submittingUserId" UUID NOT NULL,
    "sourceTrackId" UUID NOT NULL,
    "artistIdentityId" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "priorityTierSnapshotId" UUID,
    "currentQueueStatus" "QueueStatus" NOT NULL DEFAULT 'QUEUED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: submission_track_snapshots
CREATE TABLE "submission_track_snapshots" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "artistName" TEXT NOT NULL,
    "songName" TEXT NOT NULL,
    "albumName" TEXT,
    "genre" TEXT,
    "explicitContent" BOOLEAN NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "artworkS3Key" TEXT,
    "sourceType" "TrackSourceType" NOT NULL,
    "playbackCapability" "PlaybackCapability" NOT NULL,
    "mediaVersionId" UUID,
    "externalUrl" TEXT,
    "durationSeconds" INTEGER NOT NULL,
    "userProvidedHostNote" TEXT,
    "snapshotCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_track_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: queue_entries
CREATE TABLE "queue_entries" (
    "id" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "priorityRank" INTEGER NOT NULL DEFAULT 0,
    "manualSortOrder" INTEGER NOT NULL DEFAULT 0,
    "queueSequence" INTEGER NOT NULL DEFAULT 0,
    "status" "QueueStatus" NOT NULL DEFAULT 'QUEUED',
    "playingAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "carryoverFromSessionId" UUID,
    "hostFacingReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    -- Historical fields
    "movedToHistoryAt" TIMESTAMP(3),
    "movedToHistoryByUserId" UUID,
    "historyReason" TEXT,
    "wasPlayed" BOOLEAN NOT NULL DEFAULT false,
    "playbackCompleted" BOOLEAN NOT NULL DEFAULT false,
    "historicalSequence" INTEGER,
    "sourceQueuePosition" INTEGER,
    "batchOperationId" UUID,
    "sortOrder" DECIMAL(20,8) NOT NULL DEFAULT 0,

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: queue_events
CREATE TABLE "queue_events" (
    "id" UUID NOT NULL,
    "queueEntryId" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "actingUserId" UUID,
    "eventType" TEXT NOT NULL,
    "previousState" "QueueStatus",
    "newState" "QueueStatus" NOT NULL,
    "previousPosition" INTEGER,
    "newPosition" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Correlation and Batch fields
    "batchOperationId" UUID,
    "requestId" TEXT,
    "correlationId" TEXT,

    -- Real-time ordered sequence
    "eventSequence" INTEGER NOT NULL DEFAULT 1,
    "publicVisibility" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "queue_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: host_submission_notes
CREATE TABLE "host_submission_notes" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "hostUserId" UUID NOT NULL,
    "noteText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "host_submission_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: submission_upgrades
CREATE TABLE "submission_upgrades" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "queueEntryId" UUID NOT NULL,
    "previousTierSnapshotId" UUID NOT NULL,
    "newTierSnapshotId" UUID NOT NULL,
    "originalPaymentId" UUID NOT NULL,
    "upgradePaymentId" UUID NOT NULL,
    "previousQueuePosition" INTEGER,
    "newQueuePosition" INTEGER,
    "previousTotalPaidCents" INTEGER NOT NULL,
    "upgradeAmountCents" INTEGER NOT NULL,
    "newTotalPaidCents" INTEGER NOT NULL,
    "upgradedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_upgrades_pkey" PRIMARY KEY ("id")
);

-- CreateTable: queue_batch_operations
CREATE TABLE "queue_batch_operations" (
    "id" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "hostUserId" UUID NOT NULL,
    "operationType" "QueueBatchOperationType" NOT NULL,
    "reason" TEXT,
    "selectedEntryCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,
    "correlationId" TEXT,

    CONSTRAINT "queue_batch_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: playback_sessions
CREATE TABLE "playback_sessions" (
    "id" UUID NOT NULL,
    "hostUserId" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "queueEntryId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "playbackDurationSec" INTEGER NOT NULL DEFAULT 0,
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "outputPlayerMetadata" TEXT,

    CONSTRAINT "playback_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: playback_events
CREATE TABLE "playback_events" (
    "id" UUID NOT NULL,
    "liveSessionId" UUID NOT NULL,
    "queueEntryId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "seekTimeSec" INTEGER,
    "volumeLevel" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playback_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payments
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "provider" "PayoutProvider" NOT NULL DEFAULT 'STRIPE',
    "providerPaymentId" TEXT NOT NULL,
    "payingUserId" UUID NOT NULL,
    "hostUserId" UUID NOT NULL,
    "submissionId" UUID,
    "grossAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "hostAllocationCents" INTEGER NOT NULL,
    "platformAllocationCents" INTEGER NOT NULL,
    "processorFeeCents" INTEGER,
    "taxAmountCents" INTEGER,
    "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "disputedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "captureStatus" TEXT NOT NULL DEFAULT 'NOT_CAPTURED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payment_attempts
CREATE TABLE "payment_attempts" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "providerAttemptId" TEXT,
    "status" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "metaPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payment_provider_events
CREATE TABLE "payment_provider_events" (
    "id" UUID NOT NULL,
    "provider" "PayoutProvider" NOT NULL DEFAULT 'STRIPE',
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingState" TEXT NOT NULL DEFAULT 'PENDING',
    "processingAttempts" INTEGER NOT NULL DEFAULT 0,
    "payloadHash" TEXT NOT NULL,
    "payloadText" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "errorState" TEXT,

    CONSTRAINT "payment_provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payment_allocations
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "grossAmountCents" INTEGER NOT NULL,
    "hostPercentage" DECIMAL(5,2) NOT NULL,
    "platformPercentage" DECIMAL(5,2) NOT NULL,
    "hostAmountCents" INTEGER NOT NULL,
    "platformGrossAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripeFeeAmountCents" INTEGER,
    "platformNetAmountCents" INTEGER,
    "stripeConnectedAccountDest" TEXT NOT NULL,
    "stripeApplicationFeeId" TEXT,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: refunds
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "providerRefundId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "hostReversalAmountCents" INTEGER NOT NULL,
    "platformReversalAmountCents" INTEGER NOT NULL,
    "reason" TEXT,
    "adminNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCEEDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable: disputes
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "providerDisputeId" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "evidenceDetails" TEXT,
    "evidenceSubmittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: chargebacks
CREATE TABLE "chargebacks" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "chargebackValue" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chargebacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ledger_accounts
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ledger_transactions
CREATE TABLE "ledger_transactions" (
    "id" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "systemSource" TEXT NOT NULL,
    "paymentId" UUID,
    "refundId" UUID,
    "disputeId" UUID,
    "payoutId" UUID,
    "isPosted" BOOLEAN NOT NULL DEFAULT false,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ledger_entries
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: host_earnings
CREATE TABLE "host_earnings" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "submissionId" UUID,
    "liveSessionId" UUID,
    "grossAmountCents" INTEGER NOT NULL,
    "hostShareCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "HostEarningStatus" NOT NULL DEFAULT 'ALLOCATED_TO_STRIPE',
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "host_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payouts
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "payoutAccountId" UUID NOT NULL,
    "provider" "PayoutProvider" NOT NULL DEFAULT 'STRIPE',
    "providerPayoutId" TEXT NOT NULL,
    "grossPayoutCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "isInstant" BOOLEAN NOT NULL DEFAULT false,
    "arrivalEstimate" TIMESTAMP(3),
    "eligibilityStatus" TEXT,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payout_holds
CREATE TABLE "payout_holds" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "releasedByUserId" UUID,
    "releaseReason" TEXT,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "payout_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable: overlay_sets
CREATE TABLE "overlay_sets" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "canvasWidth" INTEGER NOT NULL DEFAULT 1920,
    "canvasHeight" INTEGER NOT NULL DEFAULT 1080,
    "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
    "themeId" UUID,
    "configurationJson" TEXT NOT NULL,
    "visibleFields" TEXT NOT NULL,
    "queuePrivacySettings" TEXT NOT NULL,
    "artworkBehavior" TEXT NOT NULL DEFAULT 'ZOOM_FIT',
    "placeholderBehavior" TEXT NOT NULL DEFAULT 'DEFAULT_LOGO',
    "offlineStateBehavior" TEXT NOT NULL DEFAULT 'SHOW_PLACEHOLDER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "overlay_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: overlay_scenes
CREATE TABLE "overlay_scenes" (
    "id" UUID NOT NULL,
    "setId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "layoutConfig" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "overlay_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: overlay_access_keys
CREATE TABLE "overlay_access_keys" (
    "id" UUID NOT NULL,
    "setId" UUID NOT NULL,
    "accessKeyHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "liveSessionRestriction" TEXT,
    "sceneSlugRestriction" TEXT,

    CONSTRAINT "overlay_access_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: overlay_themes
CREATE TABLE "overlay_themes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cssVariables" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overlay_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: reports
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporterUserId" UUID NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetEntityId" UUID NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "moderatorUserId" UUID,
    "moderatorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable: moderation_cases
CREATE TABLE "moderation_cases" (
    "id" UUID NOT NULL,
    "reportId" UUID,
    "targetUserId" UUID NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable: moderation_actions
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "moderatorUserId" UUID NOT NULL,
    "actionType" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "internalNotes" TEXT,
    "userVisibleNotes" TEXT,
    "notifiedUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_blocks
CREATE TABLE "user_blocks" (
    "id" UUID NOT NULL,
    "blockingUserId" UUID NOT NULL,
    "blockedUserId" UUID NOT NULL,
    "reason" TEXT,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bans
CREATE TABLE "bans" (
    "id" UUID NOT NULL,
    "targetUserId" UUID,
    "scope" "BanScope" NOT NULL DEFAULT 'FULL_PLATFORM',
    "reasonCode" TEXT NOT NULL,
    "internalReason" TEXT NOT NULL,
    "userVisibleReason" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creatingAdminUserId" UUID NOT NULL,
    "revokingAdminUserId" UUID,
    "unbannedAt" TIMESTAMP(3),
    "unbanReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ban_identifiers
CREATE TABLE "ban_identifiers" (
    "id" UUID NOT NULL,
    "banId" UUID NOT NULL,
    "identifierType" TEXT NOT NULL,
    "hashedValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ban_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: admin_audit_logs
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "actingAdminUserId" UUID NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetEntityType" TEXT NOT NULL,
    "targetEntityId" UUID NOT NULL,
    "beforeState" TEXT,
    "afterState" TEXT,
    "reason" TEXT NOT NULL,
    "requestId" TEXT,
    "sessionId" UUID,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: platform_configurations
CREATE TABLE "platform_configurations" (
    "id" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minimumPriorityPrice" INTEGER NOT NULL DEFAULT 200,
    "maximumPriorityPrice" INTEGER NOT NULL DEFAULT 50000,
    "supportedCurrencies" TEXT NOT NULL DEFAULT '["USD"]',
    "enabledPayoutProviders" TEXT NOT NULL DEFAULT '["STRIPE"]',
    "globalPayoutDelayDays" INTEGER NOT NULL DEFAULT 7,
    "globalRefundWindowDays" INTEGER NOT NULL DEFAULT 3,
    "globalUploadLimitMb" INTEGER NOT NULL DEFAULT 50,
    "maxTrackDurationSeconds" INTEGER NOT NULL DEFAULT 600,
    "featureFlags" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: platform_configuration_versions
CREATE TABLE "platform_configuration_versions" (
    "id" UUID NOT NULL,
    "configId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_configuration_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: platform_fee_rules
CREATE TABLE "platform_fee_rules" (
    "id" UUID NOT NULL,
    "ruleName" TEXT NOT NULL,
    "hostPercentage" DECIMAL(5,2) NOT NULL DEFAULT 85.00,
    "platformPercentage" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_fee_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: stripe_platform_configurations
CREATE TABLE "stripe_platform_configurations" (
    "id" UUID NOT NULL,
    "stripePlatformAccountId" TEXT NOT NULL,
    "stripePlatformDisplayName" TEXT NOT NULL,
    "stripePlatformCountry" TEXT NOT NULL,
    "stripePlatformDefaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "stripePlatformConnected" BOOLEAN NOT NULL DEFAULT false,
    "stripePlatformVerifiedAt" TIMESTAMP(3),
    "stripePlatformLastHealthCheckAt" TIMESTAMP(3),
    "stripePlatformMode" "StripePlatformMode" NOT NULL DEFAULT 'TEST',
    "stripePlatformConfigurationVersion" INTEGER NOT NULL DEFAULT 1,
    "isPaymentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_platform_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: stripe_platform_health_checks
CREATE TABLE "stripe_platform_health_checks" (
    "id" UUID NOT NULL,
    "stripePlatformConfigId" UUID NOT NULL,
    "isApiConnected" BOOLEAN NOT NULL,
    "isConnectCapabilityEnabled" BOOLEAN NOT NULL,
    "isDestinationChargesReady" BOOLEAN NOT NULL,
    "isWebhookHealthy" BOOLEAN NOT NULL,
    "lastSuccessfulHealthCheckAt" TIMESTAMP(3),
    "configurationErrors" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_platform_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: stripe_webhook_endpoint_references
CREATE TABLE "stripe_webhook_endpoint_references" (
    "id" UUID NOT NULL,
    "stripePlatformConfigId" UUID NOT NULL,
    "stripeWebhookEndpointId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "endpointUrl" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastEventReceivedAt" TIMESTAMP(3),
    "lastSuccessfulProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_endpoint_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payment_emergency_controls
CREATE TABLE "payment_emergency_controls" (
    "id" UUID NOT NULL,
    "state" "PaymentEmergencyState" NOT NULL DEFAULT 'PAYMENTS_ENABLED',
    "reason" TEXT NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "previousState" "PaymentEmergencyState" NOT NULL,
    "reEnabledAt" TIMESTAMP(3),
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_emergency_controls_pkey" PRIMARY KEY ("id")
);


-- CreateIndex: users
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_normalizedEmail_key" ON "users"("normalizedEmail");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_normalizedUsername_key" ON "users"("normalizedUsername");
CREATE INDEX "users_normalizedEmail_idx" ON "users"("normalizedEmail");
CREATE INDEX "users_normalizedUsername_idx" ON "users"("normalizedUsername");

-- CreateIndex: user_profiles
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex: user_role_assignments
CREATE UNIQUE INDEX "user_role_assignments_userId_role_key" ON "user_role_assignments"("userId", "role");

-- CreateIndex: user_permission_assignments
CREATE UNIQUE INDEX "user_permission_assignments_userId_permission_key" ON "user_permission_assignments"("userId", "permission");

-- CreateIndex: user_preferences
CREATE UNIQUE INDEX "user_preferences_userId_key_key" ON "user_preferences"("userId", "key");

-- CreateIndex: user_sessions
CREATE UNIQUE INDEX "user_sessions_tokenHash_key" ON "user_sessions"("tokenHash");
CREATE INDEX "user_sessions_tokenHash_idx" ON "user_sessions"("tokenHash");
CREATE INDEX "user_sessions_userId_revokedAt_idx" ON "user_sessions"("userId", "revokedAt");

-- CreateIndex: email_verification_token_records
CREATE UNIQUE INDEX "email_verification_token_records_tokenHash_key" ON "email_verification_token_records"("tokenHash");
CREATE INDEX "email_verification_token_records_tokenHash_idx" ON "email_verification_token_records"("tokenHash");

-- CreateIndex: password_reset_token_records
CREATE UNIQUE INDEX "password_reset_token_records_tokenHash_key" ON "password_reset_token_records"("tokenHash");
CREATE INDEX "password_reset_token_records_tokenHash_idx" ON "password_reset_token_records"("tokenHash");

-- CreateIndex: authentication_attempts
CREATE INDEX "authentication_attempts_email_timestamp_idx" ON "authentication_attempts"("email", "timestamp");
CREATE INDEX "authentication_attempts_ipAddress_timestamp_idx" ON "authentication_attempts"("ipAddress", "timestamp");

-- CreateIndex: admin_invitations
CREATE UNIQUE INDEX "admin_invitations_invitedUserId_key" ON "admin_invitations"("invitedUserId");
CREATE UNIQUE INDEX "admin_invitations_tokenHash_key" ON "admin_invitations"("tokenHash");
CREATE INDEX "admin_invitations_tokenHash_idx" ON "admin_invitations"("tokenHash");

-- CreateIndex: admin_role_changes
CREATE INDEX "admin_role_changes_targetUserId_timestamp_idx" ON "admin_role_changes"("targetUserId", "timestamp");

-- CreateIndex: legal_documents
CREATE UNIQUE INDEX "legal_documents_slug_key" ON "legal_documents"("slug");

-- CreateIndex: legal_document_versions
CREATE UNIQUE INDEX "legal_document_versions_documentId_versionString_key" ON "legal_document_versions"("documentId", "versionString");

-- CreateIndex: legal_acceptances
CREATE UNIQUE INDEX "legal_acceptances_userId_versionId_key" ON "legal_acceptances"("userId", "versionId");

-- CreateIndex: artist_identities
CREATE INDEX "artist_identities_userId_idx" ON "artist_identities"("userId");
CREATE INDEX "artist_identities_normalizedArtistName_idx" ON "artist_identities"("normalizedArtistName");

-- CreateIndex: tracks
CREATE INDEX "tracks_userId_idx" ON "tracks"("userId");
CREATE INDEX "tracks_artistIdentityId_idx" ON "tracks"("artistIdentityId");
CREATE INDEX "tracks_normalizedSongName_idx" ON "tracks"("normalizedSongName");
CREATE INDEX "tracks_artistIdentityId_normalizedSongName_idx" ON "tracks"("artistIdentityId", "normalizedSongName");

-- CreateIndex: track_media_versions
CREATE INDEX "track_media_versions_trackId_isCurrent_idx" ON "track_media_versions"("trackId", "isCurrent");

-- CreateIndex: track_artworks
CREATE INDEX "track_artworks_trackId_idx" ON "track_artworks"("trackId");

-- CreateIndex: track_external_sources
CREATE UNIQUE INDEX "track_external_sources_trackId_platform_externalId_key" ON "track_external_sources"("trackId", "platform", "externalId");

-- CreateIndex: genres
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");
CREATE UNIQUE INDEX "genres_normalizedName_key" ON "genres"("normalizedName");

-- CreateIndex: track_genres
CREATE UNIQUE INDEX "track_genres_trackId_genreId_key" ON "track_genres"("trackId", "genreId");

-- CreateIndex: host_applications
CREATE INDEX "host_applications_status_submittedAt_idx" ON "host_applications"("status", "submittedAt");

-- CreateIndex: host_application_platforms
CREATE UNIQUE INDEX "host_application_platforms_applicationId_platform_key" ON "host_application_platforms"("applicationId", "platform");

-- CreateIndex: host_profiles
CREATE UNIQUE INDEX "host_profiles_userId_key" ON "host_profiles"("userId");
CREATE UNIQUE INDEX "host_profiles_normalizedHostSlug_key" ON "host_profiles"("normalizedHostSlug");
CREATE INDEX "host_profiles_normalizedHostName_idx" ON "host_profiles"("normalizedHostName");
CREATE INDEX "host_profiles_isApproved_isPublicVisible_idx" ON "host_profiles"("isApproved", "isPublicVisible");

-- CreateIndex: host_slug_histories
CREATE INDEX "host_slug_histories_previousNormalizedSlug_idx" ON "host_slug_histories"("previousNormalizedSlug");
CREATE INDEX "host_slug_histories_newNormalizedSlug_idx" ON "host_slug_histories"("newNormalizedSlug");

-- CreateIndex: host_social_accounts
CREATE UNIQUE INDEX "host_social_accounts_hostId_platform_key" ON "host_social_accounts"("hostId", "platform");
CREATE INDEX "host_social_accounts_platform_normalizedUsername_idx" ON "host_social_accounts"("platform", "normalizedUsername");

-- CreateIndex: host_payout_accounts
CREATE UNIQUE INDEX "host_payout_accounts_providerAccountId_key" ON "host_payout_accounts"("providerAccountId");

-- CreateIndex: stations
CREATE UNIQUE INDEX "stations_slug_key" ON "stations"("slug");
CREATE INDEX "stations_isPublicVisible_deletedAt_idx" ON "stations"("isPublicVisible", "deletedAt");

-- CreateIndex: station_genres
CREATE UNIQUE INDEX "station_genres_stationId_genreId_key" ON "station_genres"("stationId", "genreId");

-- CreateIndex: station_settings
CREATE UNIQUE INDEX "station_settings_stationId_key_key" ON "station_settings"("stationId", "key");

-- CreateIndex: station_blocked_users
CREATE UNIQUE INDEX "station_blocked_users_stationId_blockedUserId_key" ON "station_blocked_users"("stationId", "blockedUserId");

-- CreateIndex: live_sessions
CREATE INDEX "live_sessions_status_idx" ON "live_sessions"("status");
CREATE INDEX "live_sessions_stationId_status_idx" ON "live_sessions"("stationId", "status");

-- CreateIndex: live_session_platforms
CREATE UNIQUE INDEX "live_session_platforms_liveSessionId_platform_key" ON "live_session_platforms"("liveSessionId", "platform");
CREATE INDEX "live_session_platforms_platform_idx" ON "live_session_platforms"("platform");

-- CreateIndex: user_live_submission_usages
CREATE UNIQUE INDEX "user_live_submission_usages_userId_liveSessionId_key" ON "user_live_submission_usages"("userId", "liveSessionId");

-- CreateIndex: live_priority_tier_snapshots
CREATE UNIQUE INDEX "live_priority_tier_snapshots_liveSessionId_priorityTierId_key" ON "live_priority_tier_snapshots"("liveSessionId", "priorityTierId");

-- CreateIndex: priority_tier_reservations
CREATE INDEX "priority_tier_reservations_expiresAt_status_idx" ON "priority_tier_reservations"("expiresAt", "status");

-- CreateIndex: submissions
CREATE INDEX "submissions_submittingUserId_idx" ON "submissions"("submittingUserId");
CREATE INDEX "submissions_sourceTrackId_idx" ON "submissions"("sourceTrackId");
CREATE INDEX "submissions_liveSessionId_idx" ON "submissions"("liveSessionId");

-- CreateIndex: submission_track_snapshots
CREATE UNIQUE INDEX "submission_track_snapshots_submissionId_key" ON "submission_track_snapshots"("submissionId");

-- CreateIndex: queue_entries
CREATE UNIQUE INDEX "queue_entries_submissionId_key" ON "queue_entries"("submissionId");
CREATE INDEX "queue_entries_liveSessionId_status_idx" ON "queue_entries"("liveSessionId", "status");
CREATE INDEX "queue_entries_priorityRank_manualSortOrder_queueSequence_idx" ON "queue_entries"("priorityRank", "manualSortOrder", "queueSequence");
CREATE INDEX "queue_entries_sortOrder_idx" ON "queue_entries"("sortOrder");

-- CreateIndex: queue_events
CREATE INDEX "queue_events_liveSessionId_createdAt_idx" ON "queue_events"("liveSessionId", "createdAt");
CREATE UNIQUE INDEX "queue_events_liveSessionId_eventSequence_key" ON "queue_events"("liveSessionId", "eventSequence");

-- CreateIndex: payments
CREATE UNIQUE INDEX "payments_providerPaymentId_key" ON "payments"("providerPaymentId");
CREATE INDEX "payments_payingUserId_idx" ON "payments"("payingUserId");
CREATE INDEX "payments_hostUserId_idx" ON "payments"("hostUserId");
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex: payment_attempts
CREATE UNIQUE INDEX "payment_attempts_providerAttemptId_key" ON "payment_attempts"("providerAttemptId");

-- CreateIndex: payment_provider_events
CREATE UNIQUE INDEX "payment_provider_events_providerEventId_key" ON "payment_provider_events"("providerEventId");

-- CreateIndex: refunds
CREATE UNIQUE INDEX "refunds_providerRefundId_key" ON "refunds"("providerRefundId");

-- CreateIndex: disputes
CREATE UNIQUE INDEX "disputes_providerDisputeId_key" ON "disputes"("providerDisputeId");

-- CreateIndex: ledger_accounts
CREATE UNIQUE INDEX "ledger_accounts_code_key" ON "ledger_accounts"("code");

-- CreateIndex: ledger_transactions
CREATE UNIQUE INDEX "ledger_transactions_idempotencyKey_key" ON "ledger_transactions"("idempotencyKey");
CREATE INDEX "ledger_transactions_effectiveAt_idx" ON "ledger_transactions"("effectiveAt");

-- CreateIndex: ledger_entries
CREATE INDEX "ledger_entries_accountId_createdAt_idx" ON "ledger_entries"("accountId", "createdAt");

-- CreateIndex: host_earnings
CREATE INDEX "host_earnings_hostId_status_idx" ON "host_earnings"("hostId", "status");

-- CreateIndex: payouts
CREATE UNIQUE INDEX "payouts_providerPayoutId_key" ON "payouts"("providerPayoutId");
CREATE INDEX "payouts_hostId_idx" ON "payouts"("hostId");

-- CreateIndex: overlay_scenes
CREATE UNIQUE INDEX "overlay_scenes_setId_slug_key" ON "overlay_scenes"("setId", "slug");

-- CreateIndex: overlay_access_keys
CREATE UNIQUE INDEX "overlay_access_keys_accessKeyHash_key" ON "overlay_access_keys"("accessKeyHash");

-- CreateIndex: overlay_themes
CREATE UNIQUE INDEX "overlay_themes_name_key" ON "overlay_themes"("name");

-- CreateIndex: reports
CREATE INDEX "reports_status_targetType_idx" ON "reports"("status", "targetType");

-- CreateIndex: user_blocks
CREATE UNIQUE INDEX "user_blocks_blockingUserId_blockedUserId_key" ON "user_blocks"("blockingUserId", "blockedUserId");

-- CreateIndex: bans
CREATE INDEX "bans_targetUserId_isActive_idx" ON "bans"("targetUserId", "isActive");

-- CreateIndex: ban_identifiers
CREATE UNIQUE INDEX "ban_identifiers_hashedValue_key" ON "ban_identifiers"("hashedValue");
CREATE INDEX "ban_identifiers_hashedValue_idx" ON "ban_identifiers"("hashedValue");

-- CreateIndex: admin_audit_logs
CREATE INDEX "admin_audit_logs_actingAdminUserId_createdAt_idx" ON "admin_audit_logs"("actingAdminUserId", "createdAt");
CREATE INDEX "admin_audit_logs_targetEntityType_targetEntityId_createdAt_idx" ON "admin_audit_logs"("targetEntityType", "targetEntityId", "createdAt");

-- CreateIndex: platform_configuration_versions
CREATE UNIQUE INDEX "platform_configuration_versions_configId_versionNumber_key" ON "platform_configuration_versions"("configId", "versionNumber");

-- CreateIndex: stripe_platform_configurations
CREATE UNIQUE INDEX "stripe_platform_configurations_stripePlatformAccountId_key" ON "stripe_platform_configurations"("stripePlatformAccountId");

-- CreateIndex: stripe_webhook_endpoint_references
CREATE UNIQUE INDEX "stripe_webhook_endpoint_references_stripeWebhookEndpointId_key" ON "stripe_webhook_endpoint_references"("stripeWebhookEndpointId");

-- CreateIndex: queue_batch_operations
CREATE INDEX "queue_batch_operations_liveSessionId_idx" ON "queue_batch_operations"("liveSessionId");
CREATE INDEX "queue_batch_operations_correlationId_idx" ON "queue_batch_operations"("correlationId");


-- ForeignKeys

ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permission_assignments" ADD CONSTRAINT "user_permission_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_security_events" ADD CONSTRAINT "user_security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admin_role_changes" ADD CONSTRAINT "admin_role_changes_actingAdminUserId_fkey" FOREIGN KEY ("actingAdminUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_role_changes" ADD CONSTRAINT "admin_role_changes_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "legal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "legal_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "artist_identities" ADD CONSTRAINT "artist_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tracks" ADD CONSTRAINT "tracks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_artistIdentityId_fkey" FOREIGN KEY ("artistIdentityId") REFERENCES "artist_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "track_media_versions" ADD CONSTRAINT "track_media_versions_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "track_artworks" ADD CONSTRAINT "track_artworks_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "track_external_sources" ADD CONSTRAINT "track_external_sources_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "track_genres" ADD CONSTRAINT "track_genres_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "track_genres" ADD CONSTRAINT "track_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "track_credits" ADD CONSTRAINT "track_credits_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "host_applications" ADD CONSTRAINT "host_applications_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "host_application_platforms" ADD CONSTRAINT "host_application_platforms_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "host_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "host_application_status_history" ADD CONSTRAINT "host_application_status_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "host_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "host_application_reviews" ADD CONSTRAINT "host_application_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "host_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "host_profiles" ADD CONSTRAINT "host_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "host_slug_histories" ADD CONSTRAINT "host_slug_histories_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_slug_histories" ADD CONSTRAINT "host_slug_histories_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "host_social_accounts" ADD CONSTRAINT "host_social_accounts_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "host_payout_accounts" ADD CONSTRAINT "host_payout_accounts_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stations" ADD CONSTRAINT "stations_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "station_genres" ADD CONSTRAINT "station_genres_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "station_genres" ADD CONSTRAINT "station_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "station_settings" ADD CONSTRAINT "station_settings_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "station_blocked_users" ADD CONSTRAINT "station_blocked_users_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "live_session_platforms" ADD CONSTRAINT "live_session_platforms_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "live_session_snapshots" ADD CONSTRAINT "live_session_snapshots_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "live_session_status_history" ADD CONSTRAINT "live_session_status_history_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "free_line_configurations" ADD CONSTRAINT "free_line_configurations_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "live_free_line_snapshots" ADD CONSTRAINT "live_free_line_snapshots_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "free_line_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_live_submission_usages" ADD CONSTRAINT "user_live_submission_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_live_submission_usages" ADD CONSTRAINT "user_live_submission_usages_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "priority_tiers" ADD CONSTRAINT "priority_tiers_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "live_priority_tier_snapshots" ADD CONSTRAINT "live_priority_tier_snapshots_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "live_priority_tier_snapshots" ADD CONSTRAINT "live_priority_tier_snapshots_priorityTierId_fkey" FOREIGN KEY ("priorityTierId") REFERENCES "priority_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "priority_tier_reservations" ADD CONSTRAINT "priority_tier_reservations_tierSnapshotId_fkey" FOREIGN KEY ("tierSnapshotId") REFERENCES "live_priority_tier_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "priority_tier_reservations" ADD CONSTRAINT "priority_tier_reservations_priorityTierId_fkey" FOREIGN KEY ("priorityTierId") REFERENCES "priority_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "priority_tier_reservations" ADD CONSTRAINT "priority_tier_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "priority_tier_reservations" ADD CONSTRAINT "priority_tier_reservations_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "payment_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submittingUserId_fkey" FOREIGN KEY ("submittingUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_sourceTrackId_fkey" FOREIGN KEY ("sourceTrackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_priorityTierSnapshotId_fkey" FOREIGN KEY ("priorityTierSnapshotId") REFERENCES "live_priority_tier_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "submission_track_snapshots" ADD CONSTRAINT "submission_track_snapshots_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_movedToHistoryByUserId_fkey" FOREIGN KEY ("movedToHistoryByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_batchOperationId_fkey" FOREIGN KEY ("batchOperationId") REFERENCES "queue_batch_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "queue_events" ADD CONSTRAINT "queue_events_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "queue_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "queue_events" ADD CONSTRAINT "queue_events_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "queue_events" ADD CONSTRAINT "queue_events_batchOperationId_fkey" FOREIGN KEY ("batchOperationId") REFERENCES "queue_batch_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "host_submission_notes" ADD CONSTRAINT "host_submission_notes_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "submission_upgrades" ADD CONSTRAINT "submission_upgrades_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submission_upgrades" ADD CONSTRAINT "submission_upgrades_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "queue_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submission_upgrades" ADD CONSTRAINT "submission_upgrades_previousTierSnapshotId_fkey" FOREIGN KEY ("previousTierSnapshotId") REFERENCES "live_priority_tier_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submission_upgrades" ADD CONSTRAINT "submission_upgrades_newTierSnapshotId_fkey" FOREIGN KEY ("newTierSnapshotId") REFERENCES "live_priority_tier_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submission_upgrades" ADD CONSTRAINT "submission_upgrades_originalPaymentId_fkey" FOREIGN KEY ("originalPaymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submission_upgrades" ADD CONSTRAINT "submission_upgrades_upgradePaymentId_fkey" FOREIGN KEY ("upgradePaymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submission_upgrades" ADD CONSTRAINT "submission_upgrades_upgradedByUserId_fkey" FOREIGN KEY ("upgradedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "queue_batch_operations" ADD CONSTRAINT "queue_batch_operations_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "queue_batch_operations" ADD CONSTRAINT "queue_batch_operations_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "queue_batch_operations" ADD CONSTRAINT "queue_batch_operations_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "queue_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "queue_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_payingUserId_fkey" FOREIGN KEY ("payingUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "disputes" ADD CONSTRAINT "disputes_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chargebacks" ADD CONSTRAINT "chargebacks_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "ledger_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "host_earnings" ADD CONSTRAINT "host_earnings_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "host_earnings" ADD CONSTRAINT "host_earnings_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "host_earnings" ADD CONSTRAINT "host_earnings_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payouts" ADD CONSTRAINT "payouts_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payoutAccountId_fkey" FOREIGN KEY ("payoutAccountId") REFERENCES "host_payout_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payout_holds" ADD CONSTRAINT "payout_holds_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "overlay_sets" ADD CONSTRAINT "overlay_sets_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "overlay_sets" ADD CONSTRAINT "overlay_sets_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "overlay_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "overlay_scenes" ADD CONSTRAINT "overlay_scenes_setId_fkey" FOREIGN KEY ("setId") REFERENCES "overlay_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "overlay_access_keys" ADD CONSTRAINT "overlay_access_keys_setId_fkey" FOREIGN KEY ("setId") REFERENCES "overlay_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_moderatorUserId_fkey" FOREIGN KEY ("moderatorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "moderation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderatorUserId_fkey" FOREIGN KEY ("moderatorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockingUserId_fkey" FOREIGN KEY ("blockingUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bans" ADD CONSTRAINT "bans_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bans" ADD CONSTRAINT "bans_creatingAdminUserId_fkey" FOREIGN KEY ("creatingAdminUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bans" ADD CONSTRAINT "bans_revokingAdminUserId_fkey" FOREIGN KEY ("revokingAdminUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ban_identifiers" ADD CONSTRAINT "ban_identifiers_banId_fkey" FOREIGN KEY ("banId") REFERENCES "bans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actingAdminUserId_fkey" FOREIGN KEY ("actingAdminUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "platform_configuration_versions" ADD CONSTRAINT "platform_configuration_versions_configId_fkey" FOREIGN KEY ("configId") REFERENCES "platform_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stripe_platform_health_checks" ADD CONSTRAINT "stripe_platform_health_checks_stripePlatformConfigId_fkey" FOREIGN KEY ("stripePlatformConfigId") REFERENCES "stripe_platform_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stripe_webhook_endpoint_references" ADD CONSTRAINT "stripe_webhook_endpoint_references_stripePlatformConfigId_fkey" FOREIGN KEY ("stripePlatformConfigId") REFERENCES "stripe_platform_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================================
-- CUSTOM DATABASE CONSTRAINTS & ADVANCED INTEGRITY
-- ============================================================================

-- 1. Nonnegative monetary amounts
ALTER TABLE "priority_tiers" ADD CONSTRAINT "check_priority_tiers_price_nonnegative" CHECK ("priceCents" >= 0);
ALTER TABLE "live_priority_tier_snapshots" ADD CONSTRAINT "check_live_priority_tier_price_nonnegative" CHECK ("priceCents" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "check_payments_gross_nonnegative" CHECK ("grossAmountCents" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "check_payments_host_alloc_nonnegative" CHECK ("hostAllocationCents" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "check_payments_platform_alloc_nonnegative" CHECK ("platformAllocationCents" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "check_payments_refunded_nonnegative" CHECK ("refundedAmountCents" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "check_payments_disputed_nonnegative" CHECK ("disputedAmountCents" >= 0);
ALTER TABLE "payment_attempts" ADD CONSTRAINT "check_payment_attempts_amount_nonnegative" CHECK ("amountCents" >= 0);
ALTER TABLE "refunds" ADD CONSTRAINT "check_refunds_amount_nonnegative" CHECK ("amountCents" >= 0);
ALTER TABLE "refunds" ADD CONSTRAINT "check_refunds_host_reversal_nonnegative" CHECK ("hostReversalAmountCents" >= 0);
ALTER TABLE "refunds" ADD CONSTRAINT "check_refunds_platform_reversal_nonnegative" CHECK ("platformReversalAmountCents" >= 0);
ALTER TABLE "disputes" ADD CONSTRAINT "check_disputes_amount_nonnegative" CHECK ("amountCents" >= 0);
ALTER TABLE "host_earnings" ADD CONSTRAINT "check_host_earnings_gross_nonnegative" CHECK ("grossAmountCents" >= 0);
ALTER TABLE "host_earnings" ADD CONSTRAINT "check_host_earnings_share_nonnegative" CHECK ("hostShareCents" >= 0);
ALTER TABLE "payouts" ADD CONSTRAINT "check_payouts_gross_positive" CHECK ("grossPayoutCents" > 0);

-- 2. Valid percentage ranges
ALTER TABLE "payment_allocations" ADD CONSTRAINT "check_host_percentage_range" CHECK ("hostPercentage" >= 0.00 AND "hostPercentage" <= 100.00);
ALTER TABLE "payment_allocations" ADD CONSTRAINT "check_platform_percentage_range" CHECK ("platformPercentage" >= 0.00 AND "platformPercentage" <= 100.00);
ALTER TABLE "platform_fee_rules" ADD CONSTRAINT "check_fee_rule_host_percentage" CHECK ("hostPercentage" >= 0.00 AND "hostPercentage" <= 100.00);
ALTER TABLE "platform_fee_rules" ADD CONSTRAINT "check_fee_rule_platform_percentage" CHECK ("platformPercentage" >= 0.00 AND "platformPercentage" <= 100.00);

-- 3. Allocation balances must match exactly
ALTER TABLE "payments" ADD CONSTRAINT "check_allocations_sum_to_gross" CHECK ("hostAllocationCents" + "platformAllocationCents" = "grossAmountCents");
ALTER TABLE "refunds" ADD CONSTRAINT "check_reversals_sum_to_refund" CHECK ("hostReversalAmountCents" + "platformReversalAmountCents" = "amountCents");

-- 4. Expiry/Timestamps logic relations
ALTER TABLE "priority_tier_reservations" ADD CONSTRAINT "check_reservation_expiry_after_created" CHECK ("expiresAt" >= "createdAt");

-- 5. Time-ordering on live sessions
ALTER TABLE "live_sessions" ADD CONSTRAINT "check_live_session_ends_after_starts" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");

-- 6. Custom partial unique constraints
CREATE UNIQUE INDEX "unique_default_artist_per_user" ON "artist_identities" ("userId") WHERE "isDefault" = true AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX "unique_current_media_version_per_track" ON "track_media_versions" ("trackId") WHERE "isCurrent" = true;

-- 7. Double-entry balanced transaction integrity trigger function
CREATE OR REPLACE FUNCTION verify_ledger_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
    entry_sum INT;
BEGIN
    -- Sum amountCents for the current transaction
    SELECT SUM("amountCents") INTO entry_sum
    FROM "ledger_entries"
    WHERE "transactionId" = NEW."id";

    IF NEW."isPosted" = true THEN
        IF entry_sum IS NULL OR entry_sum <> 0 THEN
            RAISE EXCEPTION 'Ledger transaction % cannot be posted because its entries do not balance to zero. Current imbalance: % cents.', NEW."id", COALESCE(entry_sum, 0);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to ledger_transactions table to enforce double-entry constraints
CREATE TRIGGER "ledger_transactions_balance_trigger"
BEFORE INSERT OR UPDATE OF "isPosted" ON "ledger_transactions"
FOR EACH ROW EXECUTE FUNCTION verify_ledger_transaction_balance();


-- ============================================================================
-- SECTION 18: HIGH-SECURITY OWNER ADMIN SAFEGUARDS & FAILSAFES
-- ============================================================================

-- A. Safeguard: Block any plaintext Stripe live/test secret keys (starts with stripe_live_ or TEST_STRIPE_KEY_)
ALTER TABLE "stripe_platform_configurations" 
ADD CONSTRAINT "check_no_plaintext_secrets_in_stripe_platform_config" 
CHECK ("stripePlatformAccountId" NOT LIKE 'stripe_live_%' AND "stripePlatformAccountId" NOT LIKE 'TEST_STRIPE_KEY_%');

-- B. Safeguard: At least one active OWNER_ADMIN must always remain in the system.
-- Trigger function to check Owner Admin retention before demoting or removing.
CREATE OR REPLACE FUNCTION verify_owner_admin_retention()
RETURNS TRIGGER AS $$
DECLARE
    active_owner_admin_count INT;
BEGIN
    -- If demoting, deleting, or changing an OWNER_ADMIN role assignment
    IF (TG_OP = 'DELETE' AND OLD.role = 'OWNER_ADMIN') OR 
       (TG_OP = 'UPDATE' AND OLD.role = 'OWNER_ADMIN' AND NEW.role <> 'OWNER_ADMIN') THEN
       
        -- Count how many OWNER_ADMIN role assignments still exist
        SELECT COUNT(*) INTO active_owner_admin_count
        FROM "user_role_assignments"
        WHERE role = 'OWNER_ADMIN' AND "userId" <> OLD."userId";
        
        IF active_owner_admin_count = 0 THEN
            RAISE EXCEPTION 'Database operation aborted: The final Owner Administrator cannot be removed, demoted, or deactivated. At least one active Owner Admin must always remain.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to user_role_assignments table
CREATE TRIGGER "owner_admin_retention_trigger"
BEFORE DELETE OR UPDATE ON "user_role_assignments"
FOR EACH ROW EXECUTE FUNCTION verify_owner_admin_retention();
