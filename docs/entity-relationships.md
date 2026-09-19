# Entity-Relationship Diagrams - TheQueue

Below are the Mermaid diagrams detailing entity relationships across **TheQueue** (thequeue.live) domain structure.

---

## 1. Identity, Security, & Legal Context

```mermaid
erDiagram
    User ||--o| UserProfile : "has profile"
    User ||--o{ UserRoleAssignment : "has roles"
    User ||--o{ UserPermissionAssignment : "has permissions"
    User ||--o{ UserSession : "manages sessions"
    User ||--o{ LegalAcceptance : "signs agreements"
    User ||--o{ AdminInvitation : "sends"
    User ||--o| AdminInvitation : "receives"
    User ||--o{ AdminRoleChange : "changes roles as actor/target"
    LegalDocument ||--o{ LegalDocumentVersion : "has versions"
    LegalDocumentVersion ||--o{ LegalAcceptance : "accepted version"

    User {
        uuid id PK
        string email UK
        string normalizedEmail UK
        string username UK
        string normalizedUsername UK
        string passwordHash
        boolean isHost
        boolean isAdmin
        enum accountStatus
        boolean emailVerified
    }
    UserProfile {
        uuid id PK
        uuid userId FK
        string biography
    }
    UserSession {
        uuid id PK
        uuid userId FK
        string tokenHash UK
        timestamp idleExpiresAt
        timestamp absoluteExpiresAt
    }
    LegalAcceptance {
        uuid id PK
        uuid userId FK
        uuid versionId FK
        timestamp acceptedAt
    }
    AdminInvitation {
        uuid id PK
        string email
        string intendedRole
        string tokenHash UK
        uuid createdByUserId FK
    }
    AdminRoleChange {
        uuid id PK
        uuid actingAdminUserId FK
        uuid targetUserId FK
        string previousRole
        string newRole
    }
```

---

## 2. Music Library & Artist Profiles

```mermaid
erDiagram
    User ||--o{ ArtistIdentity : "manages profiles"
    ArtistIdentity ||--o{ Track : "owns tracks"
    User ||--o{ Track : "saves tracks"
    Track ||--o{ TrackMediaVersion : "has codecs"
    Track ||--o{ TrackArtwork : "has artwork"
    Track ||--o{ TrackGenre : "categorized by"
    Genre ||--o{ TrackGenre : "linked"

    ArtistIdentity {
        uuid id PK
        uuid userId FK
        string artistName
        boolean isDefault
    }
    Track {
        uuid id PK
        uuid userId FK
        uuid artistIdentityId FK
        string songName
        enum sourceType
        enum playbackCapability
    }
    TrackMediaVersion {
        uuid id PK
        uuid trackId FK
        string originalS3Key
        bigint fileSize
        boolean isCurrent
    }
```

---

## 3. Stations, Live Sessions, & Submission Queue

```mermaid
erDiagram
    HostProfile ||--o{ Station : "operates"
    Station ||--o{ LiveSession : "hosts"
    Station ||--o{ PriorityTier : "configures"
    LiveSession ||--o{ LivePriorityTierSnapshot : "snapshots tiers"
    LiveSession ||--o{ Submission : "receives tracks"
    Submission ||--o| SubmissionTrackSnapshot : "copies metadata"
    Submission ||--o| QueueEntry : "queued under"
    QueueEntry ||--o{ QueueEvent : "tracks state changes"

    Station {
        uuid id PK
        uuid hostId FK
        string slug UK
        enum status
        timestamp archivedAt
        int maxQueueSize
    }
    LiveSession {
        uuid id PK
        uuid stationId FK
        enum status
        boolean submissionsOpen
    }
    PriorityTier {
        uuid id PK
        uuid stationId FK
        string name
        int priceCents
    }
    Submission {
        uuid id PK
        uuid submittingUserId FK
        uuid sourceTrackId FK
        uuid liveSessionId FK
        uuid paymentId FK
    }
    QueueEntry {
        uuid id PK
        uuid liveSessionId FK
        uuid submissionId FK
        int priorityRank
        enum status
    }
```

---

## 4. Stripe Payments, Ledger, and Payout Configurations

```mermaid
erDiagram
    Payment ||--o{ PaymentAllocation : "splits"
    Payment ||--o{ PaymentAttempt : "tracks charges"
    Payment ||--o{ HostEarning : "calculates share"
    Payment ||--o{ LedgerTransaction : "generates postings"
    LedgerTransaction ||--o{ LedgerEntry : "groups debits/credits"
    LedgerAccount ||--o{ LedgerEntry : "balances"
    HostProfile ||--o{ HostEarning : "earns"
    HostProfile ||--o{ Payout : "withdraws"
    StripePlatformConfiguration ||--o{ StripePlatformHealthCheck : "verifies"
    StripePlatformConfiguration ||--o{ StripeWebhookEndpointReference : "maps"

    Payment {
        uuid id PK
        string providerPaymentId UK
        int grossAmountCents
        enum status
    }
    LedgerTransaction {
        uuid id PK
        string idempotencyKey UK
        boolean isPosted
    }
    LedgerEntry {
        uuid id PK
        uuid transactionId FK
        uuid accountId FK
        int amountCents
    }
    StripePlatformConfiguration {
        uuid id PK
        string stripePlatformAccountId UK
        boolean stripePlatformConnected
        enum stripePlatformMode
    }
    StripePlatformHealthCheck {
        uuid id PK
        uuid stripePlatformConfigId FK
        boolean isApiConnected
        boolean isConnectCapabilityEnabled
    }
```
