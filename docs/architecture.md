# Architectural Design & Request Flows - TheQueue

This document outlines the core architectural components, boundaries, data flows, and future integration paths established in **TheQueue** platform.

---

## 1. Monorepo Structural Hierarchy

The platform is designed as a TypeScript monorepo to ensure maximum code reusability, consistent dependency versions, and fast build times.

### Applications (`apps/`)

- **`web` (Port 3000)**: Next.js App Router public portal. Used by listeners to browse live streams, register, upload music to their libraries, and submit tracks to hosts.
- **`host` (Port 3001)**: Next.js App Router host dashboard. Used by broadcasters to set queues, review incoming submissions, play track audio (the DJ panel), edit priorities, and configure overlays.
- **`admin` (Port 3002)**: Next.js App Router admin HQ. High-security dashboard for approving hosts, managing user accounts, checking audit trails, and reconciling payouts.
- **`api` (Port 4000)**: NestJS framework API. Serves as the **sole authoritative data gatekeeper** and validation boundary. No client application directly touches database systems or storage providers.
- **`worker` (Port 4001)**: Standalone Node.js worker processing heavy asynchronous background tasks (e.g., audio encoding, virus scanning, and payment payouts) via BullMQ queues.

### Shared Packages (`packages/`)

- **`config`**: Baseline ESLint, Prettier, and strict TSConfig templates.
- **`types`**: System-wide domain types and state machine enums.
- **`logger`**: High-performance structured Pino logger supporting correlation request tracing.
- **`validation`**: Zod validation schemas enforcing strict inputs and environmental parameters.
- **`database`**: Centralized Prisma Client configuration, DB connection checks, and lexicographically sortable **UUIDv7** generators.
- **`auth`**: Argon2id password hashing, secure token utilities, cookie configuration parameters, and privilege assertion guards.
- **`ui`**: Tailwind CSS v4 source stylesheets (`styles.css`) and 17+ dark-first reusable React components.
- **`api-client`**: Axios-based communication client with request ID propagation.

---

## 2. Definitive Request & Authentication Flow

Standard API interactions utilize strict RESTful patterns combined with highly secure session controls.

### Authentication Boundary & Session Lifecycle (Opaque Cookies)

To ensure the highest level of security, **TheQueue** utilizes **Opaque Cookie-based Session Validation**:

1. **Session Creation**:
   - On successful authentication, the API generates a cryptographically secure, random 32-byte session token (NOT a UUID).
   - The token is hashed server-side using SHA-256.
   - The SHA-256 hash, absolute expiration, and metadata (IP, User Agent) are stored as the authoritative session record in PostgreSQL.
   - The raw token is returned to the client in an `HttpOnly`, `Secure` (production-only), `SameSite=Lax` cookie.
2. **Session Verification**:
   - For every request, the browser includes the session cookie.
   - The NestJS auth guard extracts the token, hashes it with SHA-256, and queries the database (accelerated by a Redis cache) to verify the session exists, is active, and has not expired.
3. **Session Rotation**:
   - The session token is automatically rotated and re-issued after login, password changes, privilege elevation, and other security-sensitive events to prevent session-fixation attacks.
4. **Enforcement**:
   - While Next.js applications utilize server-side cookie checks to display/hide navigation panels, **the NestJS API remains the absolute enforcement boundary**. Under no circumstances does a frontend layout or query validate user privileges.

---

## 3. Data Systems Boundaries

### PostgreSQL & Prisma (Source of Truth)

PostgreSQL is the single authoritative source of truth for persistent domain models (Users, Stations, Submissions, Transactions, Sessions, Audit Records).

- All primary keys are **UUIDv7** generated inside the application service layer before write operations.
- Direct database communication occurs exclusively via the `@platform/database` package loaded on the NestJS API and worker nodes.

### Redis (Cache & Queue Broker)

Redis is utilized exclusively as a transient performance enhancer:

- **Sessions**: Caching hashed session sessions for instant NestJS auth checks.
- **BullMQ**: Queue broker managing job metadata and scheduling states.
- **Rate-limiting**: Storing sliding-window API request counters.
- Redis is NEVER the primary datastore; any item in Redis is designed to be fully recoverable or reconstructible if Redis is flushed.

### S3 Object Storage (Media Assets)

Audio uploads and track artworks are stored in private, secure, S3-compatible buckets.

- Standard clients request temporary, time-limited **S3 pre-signed URLs** from the NestJS API to perform direct secure uploads.
- Clients never receive raw write credentials.

---

## 4. Planned Integration Features (Future Phases)

These interfaces are designed as architectural placeholders to be expanded in later development milestones:

### Real-Time Communication (Socket.IO)

- **Station Live State**: Real-time broadcasts when hosts mark themselves online.
- **DJ Queue Updates**: Instantly pushing new track submissions to the host’s browser-based DJ control panel.
- **Live Overlays**: Pushing active song artwork and title changes to the OBS browser-source overlay.

### Payment Integration (Stripe Connect Only)

- **Stripe Connect Destination Charges**: Stripe is the sole enabled payment and payout provider for our production release. Standard users submit paid priority submissions through Stripe checkout gateways.
- Broadcasters set custom priority pricing.
- 85% is immediately allocated to the host's Stripe Connected account balance, and 15% is retained by TheQueue. All Stripe processing and Connect fees are paid from TheQueue's 15% application fee.
- **No Platform Wallet**: The platform does not maintain a host balance, bank settlement timing scheduler, or payout queue. Stripe Connect handles bank transfers to broadcasters directly.
- Mock payment structures are strictly forbidden; only sandboxed Stripe webhook endpoints will drive state transitions.

### Broadcaster Station Management & Cardinality

- **Multi-Station Support**: Each HostProfile can own multiple `Station` profiles over time (`1:N` cardinality). Each station belongs to exactly one host.
- **Station Lifecycle Status**: Stations support lifecycle status (`ACTIVE`, `INACTIVE`, `ARCHIVED`). Archiving a station preserves historical live sessions, queue entries, submissions, payments, and other historical data, enforced via restrictive database foreign key constraints (`onDelete: Restrict`).
