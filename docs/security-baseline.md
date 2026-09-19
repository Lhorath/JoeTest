# Security Baseline & Hardening Controls - TheQueue

Security is not an afterthought in **TheQueue**. This baseline establishes the core hardening, validation, and architectural safeguards integrated into the platform foundation.

---

## 1. Auth & Session Hardening

- **Lightweight Custom Sessions**: Session management relies on opaque session tokens generated using cryptographically secure random bytes (NOT UUIDs).
- **Server-Side Hashing**: Only the SHA-256 hash of the session token is stored in the database. Compromising the session store reveals zero active session tokens.
- **Secure Cookie Configuration**:
  - `HttpOnly`: true (Protects cookies from XSS-based reading).
  - `Secure`: true in production (Requires HTTPS).
  - `SameSite`: Lax (Mitigates CSRF vulnerabilities).
  - `Path`: `/` (Scope restricted).
- **Session Rotation**: Hashed session values are rotated immediately upon login, privilege elevations, or security updates.

---

## 2. API Validation & Security Headers

- **Authoritative Enforcement Boundary**: All permissions and access policies are strictly enforced server-side inside the NestJS API guards. Frontend navigation elements are treated as visual conveniences, never as enforcement gates.
- **No Direct Trust of Client-Provided User IDs**: The API never trusts client-provided user IDs. The current user ID is extracted strictly from the validated session context server-side.
- **Secure HTTP Headers (Helmet)**: Express middleware automatically injects robust security headers, including Content Security Policy (CSP), X-Content-Type-Options, and Referrer-Policy.
- **CORS Allowlist**: CORS rules utilize an explicit, environment-controlled allowlist of domains rather than wildcards (`*`).

---

## 3. Safe Data Practices

- **Argon2id Password Hashing**: Passwords are secure-hashed using Argon2id with strict, industry-leading parameters (`memoryCost: 65536, timeCost: 3, parallelism: 4`).
- **No Secrets in Client Bundles**: Client-facing Next.js applications utilize explicit Next.js bundler exclusions. Server secrets are excluded from Webpack scanning.
- **Input Sanitization**: No raw database queries. Prisma ORM parameterizes all transactions out of the box, eliminating SQL Injection risks.
- **Structured Error Response**: internal API stack traces are scrubbed in the global exception filter. Production responses contain only safe error codes.
