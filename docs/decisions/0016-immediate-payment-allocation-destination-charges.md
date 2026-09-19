# ADR 0016: Stripe Connect Destination Charges with Immediate 85/15 Split

## Status

Approved

## Context

When artists submit paid priority tracks to host streams, we need to split the payment securely. Holding funds or using manual payout transfers creates complex legal obligations and increases platform risk.

## Decision

We utilize **Stripe Connect Destination Charges with an Application Fee**.

- At charge capture, the host Connected account immediately receives 85% of the gross payment in their Stripe balance.
- TheQueue receives a 15% application fee.
- Stripe processing fees and Connect fees are deducted from TheQueue's 15% platform fee portion, keeping the host's 85% contractual allocation completely whole.
- Payouts are made directly from Stripe to the host's bank account, with support for Stripe Instant Payouts.

## Consequences

- No platform liability for holding or escrowing host funds.
- Automatic fee-splitting driven natively by Stripe.
- Immediate payout eligibility for broadcasters.
