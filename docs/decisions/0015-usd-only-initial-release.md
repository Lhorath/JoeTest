# ADR 0015: USD-Only Initial Release with Strict Cents Validation

## Status

Approved

## Context

Handling multiple exchange rates, localized currencies, and currency conversions during our initial launch introduces massive accounting overhead, Stripe Connect compliance challenges, and high risk of floating-point division errors.

## Decision

We restrict **TheQueue**'s initial release to **USD only**.

- All transactions, payouts, ledger balances, and custom priority tiers are strictly validated in USD.
- Monetary values are stored as integers in **US cents** (no floating point decimals are allowed).
- We seed only USD as the default currency and enforce a custom host-tier price floor of **$2.00 USD (200 cents)** to protect platform margins from Stripe fixed fees.

## Consequences

- Highly simplified accounting math with zero exchange rate complexity.
- Total protection against floating-point round-off errors.
- Stable, predictable billing structures.
