# ADR 0020: High-Security Owner Admin Retention Failsafe

## Status

Approved

## Context

If a system has no automated checks on administrative account deactivations or role mutations, a series of mistakes or malicious acts can demote or delete the final Owner Administrator, locking everyone out of the platform entirely.

## Decision

We enforce a strict database-level failsafe trigger `verify_owner_admin_retention()` on the `user_role_assignments` table.

- Whenever an `OWNER_ADMIN` role assignment is deleted or updated to another role, the trigger verifies that at least one other active `OWNER_ADMIN` remains in the system.
- If the active count drops to 0, the database aborts the transaction and throws a hard SQL exception.
- Standard moderators cannot escalate their privileges or modify Owner Admin status.

## Consequences

- 100% protection against accidental admin lockouts.
- Immutable security logic enforced directly by the authoritative datastore.
- Secure operations management.
