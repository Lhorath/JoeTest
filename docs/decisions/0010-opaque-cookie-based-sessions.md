# ADR 0010: Opaque Cookie-based Sessions

## Status

Approved

## Context

Standard JWT-bearer tokens cannot be easily revoked before expiration, and storing them in browser localStorage exposes them to XSS attacks.

## Decision

We enforce **Opaque Cookie-based Sessions** (relying on secure random tokens) validated against a hashed record in the database.

## Consequences

- Enhanced security: session tokens are stored in `HttpOnly`, `Secure`, and `SameSite` cookies.
- Real-time session revocation and rotation.
- Protection from session-fixation and CSRF attacks.
