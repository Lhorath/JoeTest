# ADR 0007: Redis and ioredis Client

## Status

Approved

## Context

High-volume operations like rate-limiting, session checks, and background queues require sub-millisecond key-value indexing.

## Decision

We utilize **Redis** as a transient cache broker, driven consistently by the **ioredis** client library.

## Consequences

- Fast sliding-window counters and session query checks.
- Native, robust driver compatibility with BullMQ.
- Fully isolated connection settings to prevent port conflicts or connection limits.
