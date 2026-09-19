# ADR 0021: Non-Secret Stripe Metadata and Plaintext Secrets Block

## Status

Approved

## Context

Storing plaintext API credentials (like Stripe secret keys `LIVE\_STRIPE\_KEY\_...`) in a relational database or exposing them in logs can lead to catastrophic credit card or balance compromises.

## Decision

We enforce strict data isolation and credential masking:

- Plaintext Stripe secret keys are **never** stored in the database. Production secrets are loaded exclusively via encrypted environment variables or a secure secrets manager.
- The database stores only non-secret Stripe metadata (display name, platform mode, verification times, webhook IDs) inside `StripePlatformConfiguration`.
- We add a PostgreSQL database-level `CHECK` constraint to block any values starting with `sk\_` or matching credential syntax from being saved in the account ID field.
- Admin APIs mask keys (e.g. `LIVE\_STRIPE\_KEY\_••••••••tKey`) and loggers recursively redact sensitive keys before writing payloads.

## Consequences

- Zero risk of credential leaks from SQL dumps.
- Fully standardized secure-credential rotation.
- Secure diagnostic logging.
