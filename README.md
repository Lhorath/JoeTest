# TheQueue - Live Music-Submission & Livestream-Management Platform

TheQueue is a production-grade, highly scalable platform designed to connect music creators directly with live stream broadcasters. Built with a modern TypeScript monorepo, it empowers standard users to upload music, build personal libraries, and submit tracks to approved stream hosts. Host broadcasters can then configure their custom music station, open queues, process payments, and manage audio submissions live using a browser-based DJ control panel with real-time stream overlays.

## 🏗️ Monorepo Architecture Overview

This project is organized as a high-performance, strictly-typed monorepo utilizing **pnpm workspaces** and **Turborepo** caching.

```text
apps/
  ├── web/       - The standard public website and uploader interface (Port 3000)
  ├── host/      - The host dashboard and DJ queue panel (Port 3001)
  ├── admin/     - The system administrator console (Port 3002)
  ├── api/       - NestJS backend API application (Port 4000)
  └── worker/    - Standalone Node.js BullMQ asynchronous job worker (Port 4001)

packages/
  ├── config/    - Shared TypeScript and bundler configs
  ├── types/     - Common TypeScript models and domain enums
  ├── logger/    - Structured Pino logging framework with tracing
  ├── validation/ - Centralized Zod environmental & input validation
  ├── database/  - Prisma ORM setup, connection client, & UUIDv7 tools
  ├── auth/      - Argon2id hashing, secure tokens, & privilege guards
  ├── ui/        - Tailwind CSS v4 shared React components and design system
  └── api-client/- Typed Axios client for frontend-to-backend communication
```

## 🛠️ Prerequisites

To run this platform locally, make sure you have the following installed:

- **Node.js**: `v20.0.0` or higher (LTS recommended)
- **pnpm**: `v9.0.0` or higher (Uses lockfile version 9)
- **Docker & Docker Compose**: For containerized infrastructure services

## 🚀 Local Quickstart Guide

### 1. Provision Infrastructure

Bring up PostgreSQL, Redis, MinIO (S3-compatible Object Storage), and Mailpit (local SMTP email trap) using Docker Compose:

```bash
pnpm infrastructure:up
```

_Note: S3 storage buckets are automatically initialized on startup._

### 2. Configure Environment Variables

Copy the development environment parameters template file:

```bash
cp .env.example .env
```

### 3. Initialize Database

Generate the type-safe Prisma client and execute initial migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

### 4. Install Dependencies

Install all workspace packages and links:

```bash
pnpm install
```

### 5. Start Development Servers

Run all Next.js applications, the NestJS API, and the BullMQ worker concurrently under watch mode:

```bash
pnpm dev
```

---

## 🧪 Testing System

We utilize **Vitest** for workspace-wide unit/integration tests and **Playwright** for end-to-end user flows.

### Run Unit & Integration Tests

Runs all 23 concurrent, offline unit and integration tests across our packages and app API layers:

```bash
pnpm test
```

### Run End-to-End Tests

Executes Playwright smoke tests to verify application shell load and layout parameters:

```bash
pnpm test:e2e
```

---

## 📖 Deep-Dive Architecture & Standards

Detailed standards and architectural decisions are thoroughly documented in the `docs/` folder:

- **[Architecture & Flow](docs/architecture.md)**: Deep dive on Monorepo patterns, Auth boundaries, and Worker systems.
- **[Development Standards](docs/development-standards.md)**: Naming, logging, validation, and database rules.
- **[Security Baseline](docs/security-baseline.md)**: Cryptographic guidelines, headers, and secret scanning.
- **[Testing Guidelines](docs/testing.md)**: Integration and mocking patterns.
- **[Local Infrastructure](docs/local-infrastructure.md)**: Docker container details, ports, and reset workflows.
- **[Architectural Decisions (ADRs)](docs/decisions/)**: Records of key technical choices (UUIDv7, Opaque cookies, Next.js App Router, NestJS).
