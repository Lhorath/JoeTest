# TheQueue - Core Domain Models Reference

This document maps out the core logical entities, account configurations, and relationships established inside **TheQueue** (thequeue.live).

---

## 1. Core Users and Authorizations

- **User**: Represents a platform login context.
  - Multi-Role Support: We avoid mutually exclusive role enums. A user has `isHost` (boolean) and `isAdmin` (boolean) flags, combined with many-to-many role assignments via `UserRoleAssignment` and `UserPermissionAssignment` tables.
  - Supported account states: `ACTIVE`, `PENDING_EMAIL_VERIFICATION`, `SUSPENDED`, `BANNED`, `DEACTIVATED`, `DELETION_PENDING`.
- **UserProfile**: Holds user biography, country, and secure image keys.

---

## 2. Administrative Role Division

TheQueue implements a highly secure, server-enforced administrative split:

### A. Owner Administrator (`OWNER_ADMIN`)

Holds absolute operational and structural platform authority:

- Configures Stripe platform account, Connect destinations, and commission setups.
- Invites other Administrators, creates/demotes/suspends Moderators, and manages credentials.
- Retained via database-level failsafe trigger (the final Owner Admin cannot be removed or demoted).

### B. Moderator (`MODERATOR`)

Holds subset of operational privileges created exclusively by an Owner Admin:

- Approves, rejects, suspends, or revokes hosts.
- Bans/unbans users, moderates prohibited content, and reviews transaction logs.
- Cannot configure the Stripe platform account, view secret credentials, change payouts, or manage administrators.

---

## 3. Secure Opaque Sessions & Administrative Invites

- **UserSession**: Manages secure sessions. It tracks `tokenHash` (SHA-256 hash of a secure random 32-byte session token, NOT a UUID), IP address, user agent, expiration limits (`idleExpiresAt`, `absoluteExpiresAt`), and revocation states.
- **AdminInvitation**: Handles secure, hashed administrative invites with role assignments (`intendedRole`) and expiration boundaries.
- **AdminRoleChange**: Tracks a historical change of administrative roles with act-by details, target user, and reasons, fully audited.

---

## 4. Reusable Artist Identities

- **ArtistIdentity**: Tracks user band profiles. A user can manage multiple identities, but only one is default (`isDefault: true`), enforced via a PostgreSQL partial unique index:

```sql
CREATE UNIQUE INDEX unique_default_artist_per_user ON artist_identities (userId) WHERE isDefault = true AND deletedAt IS NULL;
```

This isolates the account display name from the public artist name, and supports clean soft deletions.

---

## 5. Public Host Pages & Normalized Slugs

Approved broadcasters have public pages mapped directly under `/ {hostSlug}`. Slugs are validated case-insensitively using a unique normalized index `normalizedHostSlug`, ensuring that two hosts cannot register slugs that differ solely by capitalization (e.g. `Emerald` vs `emerald`). Previous slugs are preserved historically in the `HostSlugHistory` model to facilitate permanent or temporary 301 redirects, ensuring that old livestream links remain unbroken.

System reserved routes (such as `/admin`, `/api`, `/host`, etc.) are protected through shared validation constraints to block users from hijacking critical application routes.

---

## 6. Station Cardinality and Lifecycle Status

The platform allows hosts to own and manage multiple stations over time:

- **HostProfile $\rightarrow$ Stations** (`1:N`): A single HostProfile can own and manage multiple `Station` profiles. Each `Station` belongs to exactly one host.
- **Station Lifecycle Status**: Enforced via `StationStatus` enum:
  - `ACTIVE`: Station is usable and publicly visible.
  - `INACTIVE`: Station is temporarily suspended/unavailable, but preserved for broadcaster editing.
  - `ARCHIVED`: Historical archival state. Reinsertion/live sessions are disabled unless restored.
- **Data Preservation Safeguards**: Station deactivation or archival uses strict database-level restrictive referential actions (`onDelete: Restrict`) on all child historical tables (`LiveSession`, `Submission`, `Payment`, etc.). This guarantees that historical records, financial ledger transactions, and audit sequences are never cascade-deleted or modified retroactively.
