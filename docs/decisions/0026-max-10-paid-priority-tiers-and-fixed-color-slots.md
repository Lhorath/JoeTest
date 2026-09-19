# ADR 0026: Maximum Paid Priority Tiers and Globally Fixed Color Slots

## Status

Accepted

## Context

Broadcasters need the ability to configure custom paid priority tiers (e.g. VIP, Fast Pass, Skip) for their stations. However, allowing arbitrary styling, glowing borders, or arbitrary hexadecimal colors on public pages can:

- Ruin accessible contrast standards for color-blind or low-vision users.
- Create visual clutter and inconsistent brand representation across different broadcaster channels.
- Cause infinite creation of tiers which degrades system lookup performance.

We need a system that offers host pricing flexibility while maintaining global styling stability and accessibility standards.

## Decision

We enforce a strict station-wide maximum of 10 active paid priority tiers and map them to globally fixed, consistent color slots.

### Implementation Details:

1. **Tier Capacity Restrictions**:
   - Every broadcaster station is limited to a maximum of 10 active paid priority tiers.
   - Tiers that are soft-deleted or inactive do not count toward this limit.
   - The future NestJS service layer will enforce this inside a transaction during tier creation.

2. **Globally Consistent Color Slots**:
   - Instead of arbitrary hex codes, we introduce a `TierColorSlot` enum.
   - We assign 10 fixed color identifiers representing a consistent progression of priority:
     - `TIER_COLOR_1` (Highest Priority): purple/magenta
     - `TIER_COLOR_2`: red
     - `TIER_COLOR_3`: orange
     - `TIER_COLOR_4`: yellow
     - `TIER_COLOR_5`: green
     - `TIER_COLOR_6`: teal
     - `TIER_COLOR_7`: cyan
     - `TIER_COLOR_8`: blue
     - `TIER_COLOR_9`: blue-gray
     - `TIER_COLOR_10` (Lowest Paid Priority): slate
   - Tiers are assigned these colors deterministically based on their priority rank.

3. **Accessibility Safeguards**:
   - **No Color Alone**: Color is never used as the sole conveyor of priority. Every row and badge renders BOTH the globally consistent color AND the host-defined name (e.g. `[Red Badge] Instant Review`).
   - Standard screen-reader labels and alt-texts are supported.

## Consequences

- **Pros**:
  - Consistent visual identity across the entire ecosystem.
  - Guaranteed high-contrast accessibility compliance.
  - Prevents database bloating.
- **Cons**:
  - Broadcasters cannot choose arbitrary hex values for their tiers, which is an intentional restriction to maintain quality control.
