# ADR 0012: REST API and URI Versioning

## Status

Approved

## Context

API requirements will evolve. Introducing breaking endpoint changes without versioning disrupts active client sessions or mobile wrapper integrations.

## Decision

We utilize a RESTful API structure with strict **URI versioning** (e.g., `/api/v1/...`).

## Consequences

- Clean coexistence of old and new API contracts.
- Improved API discoverability.
- Standards-compliant HTTP response status codes.
