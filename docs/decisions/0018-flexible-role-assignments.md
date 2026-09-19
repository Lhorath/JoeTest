# ADR 0018: Flexible Many-to-Many Role Assignments

## Status

Approved

## Context

A user account in **TheQueue** may hold multiple non-exclusive roles (e.g., they can be a regular listener, a stream host, and a support moderator simultaneously). Modeling these states as a single, mutually exclusive enum column (e.g. `role: UserRole`) introduces severe rigidity and breaks future privilege escalation pathways.

## Decision

We decouple role management from the `User` model using many-to-many role assignments via the `UserRoleAssignment` and `UserPermissionAssignment` tables.

- Standard users are the baseline.
- Host privileges are tracked using `isHost` boolean flags, backed by a verified `HostProfile`.
- Administrator states are flagged using `isAdmin` boolean flags.
- Extensible, administrative-focused roles like `SUPER_ADMIN` or `FINANCE_ADMIN` are stored inside the `UserRoleAssignment` table.

## Consequences

- Clean support for overlapping user identities.
- Extensible, fine-grained access control.
- Seamless administrative authorization.
