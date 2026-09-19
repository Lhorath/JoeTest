# Testing Architecture & Guidelines - TheQueue

The testing framework in **TheQueue** is built around fast, reliable, and isolated testing layers using **Vitest** for packages and server integrations, and **Playwright** for web interface smoke testing.

---

## 1. Testing Hierarchy

### Unit Testing (Vitest)

Unit tests cover isolated logic, pure functions, and utilities.

- **Location**: Adjacent to files under `__tests__` folders (e.g., `packages/auth/src/__tests__/auth.test.ts`).
- **Execution**: Concurrent and completely offline.

### Integration Testing (Supertest + Vitest)

Integration tests verify endpoint wiring, version routing, and middleware functionality inside a test NestJS harness.

- **Location**: Inside application test directories (e.g., `apps/api/src/__tests__/api-integration.test.ts`).
- **Mocking**: Database connections, external storage endpoints, and Redis connections are mocked globally to ensure speed and stability.

### End-to-End (E2E) Testing (Playwright)

E2E tests verify user workflows, layout responsiveness, and full application loading states.

- **Location**: Root `e2e/` folder.
- **Execution**: Starts local application servers and operates headless Chromium tests.

---

## 2. Mocking & Isolation Strategy

To ensure tests remain fast, reproducible, and robust:

- **No Production Database Connections**: Unit and integration tests must never connect to a live or development database. All Prisma queries during unit runs are mocked.
- **Redis Mocking**: Redis client interactions are mocked using a standard PONG ping interface.
- **S3 Mocking**: S3-compatible endpoints utilize fallback development flags or direct mock clients.

---

## 3. Standard Test Commands

All test commands are coordinated via root scripts:

- **Run all unit/integration tests**: `pnpm test` (Runs `npx vitest run` across the workspace).
- **Run E2E tests**: `pnpm test:e2e` (Triggers Playwright runs against built servers).
