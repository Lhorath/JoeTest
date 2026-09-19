# Data Retention & Soft Deletion Policy - TheQueue

This document outlines how data lifecycle events, soft-deletion queries, immutability, and compliance purges are handled in **TheQueue** (thequeue.live).

---

## 1. Selective Soft Deletion Strategy

To balance GDPR user rights ("Right to be Forgotten") with financial and compliance audit requirements, we apply soft deletion **selectively**:

### Soft-Deletable Models (User-Controlled)

These models represent user profile or library configurations. They can be soft-deleted by setting `deletedAt = CURRENT_TIMESTAMP`:

- **`User`**: Blocks login, anonymizes public handles.
- **`UserProfile`**: Hides personal profile biography/banner keys.
- **`ArtistIdentity`**: Hides band page.
- **`Track`**: Removes track from active music library selection.
- **`Station`**: Suspends livestream broadcaster directories.
- **`OverlaySet`**: Disables OBS web overlay source links.

### Immutable Models (Append-Only)

These models contain historical truth and compliance history. They **never** support soft deletion or in-place mutations:

- **`LedgerTransaction` / `LedgerEntry`**: Accounting transactions are permanent.
- **`Payment` / `Refund` / `Dispute`**: Financial statements are immutable.
- **`PaymentProviderEvent`**: Webhook receipts are immutable.
- **`AdminAuditLog`**: Administrative history is immutable.
- **`LegalAcceptance`**: User terms agreement history is permanent.
- **`Ban`**: Banned history remains permanent for security checks.
- **`QueueEvent`**: Queue reordering history remains for audit.

---

## 2. Expired Session Cleaning

Inactive user sessions represent unnecessary database bloat.

- **UserSession Cleanup**: A recurring background cron job in `apps/worker` will query and purge all sessions where `absoluteExpiresAt < NOW()` or `revokedAt IS NOT NULL`. PostgreSQL indexes are specifically configured to accelerate this cleanup.

---

## 3. Account Deletion Workflow

When a user requests absolute deletion (`AccountStatus = DELETION_PENDING`):

1. The user account status updates immediately, restricting login context.
2. An async cleanup job runs:
   - User profile, tracks, and artists are marked deleted.
   - Associated S3 object keys (audio, artworks) are queued for background S3 bucket purges.
   - Historical ledger and payment transactions remain intact for accounting integrity, with user references set to null if GDPR anonymization is legally triggered.
