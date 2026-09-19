# ADR 0011: Time-Ordered UUIDv7 Domain Identifiers

## Status

Approved

## Context

Standard UUIDv4 values are completely random, which fragments PostgreSQL B-tree indexes, degrading insertion performance at scale.

## Decision

We utilize **UUIDv7** as the default format for domain entities, generated inside the application layer prior to insertion.

## Consequences

- Lexicographically sortable keys that preserve index locality.
- Simplified debugging via built-in timestamps.
- Native storage as standard 16-byte UUIDs in PostgreSQL.
