# ADR 0022: Payment Emergency Control States

## Status

Approved

## Context

During a critical platform incident, fraud event, or security breach, administrators need to stop new financial transactions instantly. Deleting configurations or shutting down servers creates long-term service disruption.

## Decision

We introduce a centralized `PaymentEmergencyControl` model:

- Enforces three distinct states: `PAYMENTS_ENABLED`, `PAYMENTS_PAUSED`, and `PAYMENTS_DISABLED`.
- Triggering state changes requires explicit re-authentication and is limited exclusively to Owner Administrators.
- Pausing or disabling payments stops credit-card submissions while allowing free queues to continue normally unless separately disabled.
- Every state shift is historically tracked with acting users, reasons, and timestamps.

## Consequences

- Immediate response capabilities during financial emergencies.
- No risk of corrupting configurations under stress.
- GranularOperational controls.
