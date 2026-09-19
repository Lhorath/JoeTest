# ADR 0019: Selective Soft Deletion vs. Historical Immutability

## Status

Approved

## Context

When users request to delete their accounts, artists profiles, or library tracks, we must comply with GDPR "Right to be Forgotten" mandates. However, deleting records directly can break financial ledgers, transactional logs, and compliance audit trails.

## Decision

We implement a highly selective **Soft Deletion** strategy:

- User-controlled models (User, Profile, Artist, Track, Station, Overlay) support soft-deletion via `deletedAt` timestamps. Soft-deleted items are filtered out of active queries.
- Transactional and audit-critical tables (Ledger entries, payments, webhook records, audit logs, legal acceptances, and ban history) are **completely immutable**. They can never be soft-deleted or mutated.
- When an account is permanently purged, we soft-delete their profile and library tracks (clearing S3 media keys), while maintaining payment and ledger histories anonymized.

## Consequences

- 100% compliance with privacy laws.
- Perfect financial auditability: ledger totals remain perfectly intact even after users delete their accounts.
- Zero broken relational foreign keys.
