# ADR 0005: Standalone BullMQ Worker

## Status

Approved

## Context

API instances should stay lightweight, responsive, and avoid blocking the event loop with heavy async tasks (e.g., audio file processing, video artwork transformations).

## Decision

We separate background jobs into a dedicated, standalone **TypeScript/Node.js worker process** backed by **BullMQ** and **ioredis**.

## Consequences

- The API remains responsive and handles HTTP traffic quickly.
- Heavy background jobs are isolated in worker containers that can scale independently.
- Leverages Redis' high-speed transactions for reliable task queuing.
