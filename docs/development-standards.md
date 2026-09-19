# Development Standards & Coding Guidelines - TheQueue

To maintain high code quality, system safety, and maintainability across **TheQueue** codebase, all developers must strictly adhere to the following standards.

---

## 1. Naming Conventions

### File & Directory Structure

- **React Components**: PascalCase (e.g., `Button.tsx`, `Tabs.tsx`).
- **TypeScript Modules/Utilities**: kebab-case (e.g., `test-db-connection.ts`, `uuid-v7.ts`).
- **Prisma Schema Mapping**: Database tables must map to plural, lowercase snake_case names using `@@map` (e.g., `@@map("users")`), while fields should be standard camelCase.

### Coding Style

- **TypeScript Strict Mode**: Strict type-checking is enabled globally. The use of `any` is strictly prohibited unless accompanied by a written, compelling technical justification.
- **Timestamp Formatting**: All timestamps stored in the database or processed in code must utilize UTC standards.

---

## 2. Module Organization & Code Isolation

- **High Cohesion, Low Coupling**: Isolate functional units. Each major domain module in the NestJS API (such as Music Library, Live Sessions, Submissions, and Payments) must remain highly cohesive and reside in its own cohesive module folder.
- **Centralized Dependencies**: Avoid duplicating packages. Shared utilities like logging, database access, session structures, and input validation must live inside their respective shared `@platform/*` packages.
- **Composition over Inheritance**: Prefer combining lightweight, reusable classes/functions rather than creating deeply nested inheritance trees.

---

## 3. Strict Input & Environmental Validation

- **No Raw Inputs**: All API request bodies, query parameters, and route parameters must be validated using Zod schemas wrapped in NestJS `ValidationPipe` or direct safe parsers.
- **Fail Early on Boot**: All applications must validate their environment variables during the boot sequence using the centralized `@platform/validation` package. Startup must terminate immediately with clear logs if required configurations are missing.
- **No Client Secrets**: Client-side Next.js applications must never possess server-only secrets. Next.js variables must only be exposed to the client if they are strictly non-sensitive and explicitly prefixed with `NEXT_PUBLIC_`.

---

## 4. Structured Logging Guidelines

- **Standard Log Instance**: Always use the child logger generated via `@platform/logger`'s `createLogger(appName)` utility.
- **Secret Redaction**: Structured logging must automatically redact sensitive fields like: `password`, `passwordHash`, `token`, `secret`, `cookie`, `authorization`, `creditCard`.
- **Correlation IDs**: Log records inside the API must include the corresponding `requestId` propagated via headers.

---

## 5. Error Handling & Security Guidelines

- **No Leaked Stack Traces**: Production API error responses must return safe, sanitized error payloads containing human-friendly messages and system codes. Detailed stack traces must live only on secure server-side log aggregators.
- **Zero Raw Credentials**: Never store raw passwords, authorization secrets, or payment credentials. Passwords must be hashed using Argon2id using the centralized `@platform/auth` package.
- **Centralized UUIDv7 Generation**: Primary keys for domain entities must be lexicographically orderable UUIDv7 values generated in the application layer via `@platform/database`'s centralized utility.

---

## 6. Testing Expectations

- **TDD Practices**: Developers are strongly encouraged to write failing tests before implementing feature refinements.
- **Mock External Services**: Tests must run completely isolated and offline. Direct connections to production endpoints or databases during unit and integration runs are strictly forbidden.
- **Database Isolation**: Integration tests must execute against a dedicated, clean test database configuration separate from development and production.
