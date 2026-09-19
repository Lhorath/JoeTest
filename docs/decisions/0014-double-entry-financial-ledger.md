# ADR 0014: Double-Entry Financial Ledger Foundation

## Status

Approved

## Context

Tracking monetary transactions, platform fees, refunds, and payouts using mutable fields (like a single "balance" column on a user or host table) makes the system prone to discrepancies, prevents accurate financial auditing, and fails GAAP compliance.

## Decision

We implement a true double-entry, balanced, append-only financial ledger using three core models: `LedgerAccount`, `LedgerTransaction`, and `LedgerEntry`.

- Every ledger transaction must group debits (positive cents) and credits (negative cents) that sum to exactly 0.
- We add a raw PostgreSQL database trigger to block any unbalanced transaction posting.
- We keep the ledger completely provider-neutral; Stripe is simply one transaction source.

## Consequences

- 100% auditable transactional history.
- Zero mathematical drift: Host balances are dynamically calculated by summing ledger entries.
- Easy integration of future payment gateways.
