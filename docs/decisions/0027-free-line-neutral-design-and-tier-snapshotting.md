# ADR 0027: Free Line Neutral Design and Tier Snapshotting

## Status

Accepted

## Context

Standard users can submit tracks through a Free Line or paid priority tiers.

We need to ensure:

1. The Free Line is visually distinguished from paid priority lines to maintain clear product boundaries.
2. Changes made by hosts to their station settings (tier pricing, priority rank, names, or colors) do not retroactively rewrite historical submissions, payment splits, ledger entries, or closed live session layouts.

## Decision

We enforce a neutral appearance for the Free Line and mandate complete, immutable tier configuration snapshotting upon live session preparation.

### Implementation Details:

1. **Free Line Isolation**:
   - The Free Line is treated as a separate, distinct concept and is represented by `FREE_LINE` (or `FREE_TIER_COLOR`) in our `TierColorSlot` enum.
   - It is visually excluded from the 10 paid tier slots.
   - It renders using a globally consistent neutral grey outline/background, standard text styling, and contains no premium glow or paid icons.

2. **Live Session Snapshotting**:
   - When a host prepares or starts a live session, the system copies all active tiers into `LivePriorityTierSnapshot`.
   - Each snapshot captures: `name`, `priceCents`, `priorityRank`, `displayOrder`, `colorSlot`, limits, and visibility.
   - Submissions made during the live session reference the immutable `LivePriorityTierSnapshot` rather than the live `PriorityTier` model.
   - This isolates active historical records from future settings adjustments, preserving precise visual layouts and billing audits.

## Consequences

- **Pros**:
  - Immutability of billing audits, payment records, and event logs.
  - Guaranteed visual separation between free queue items and premium ones.
  - Broadcasters can safely modify their station configuration without altering active livestream sessions.
- **Cons**:
  - Requires writing snapshot copies at the beginning of each live session, which is a fast, lightweight database write.
