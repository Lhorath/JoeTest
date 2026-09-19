# ADR 0002: Next.js App Router for Frontends

## Status

Approved

## Context

Our frontends must remain highly interactive, SEO-optimizable, and leverage modern React features. Next.js is the industry standard for production-grade React platforms.

## Decision

We adopt **Next.js App Router** exclusively across all user-facing web applications.

## Consequences

- Native support for React Server Components (RSC) to fetch layout parameters quickly on the server.
- Streamlined layout nesting and clean route segment groupings.
- Modern routing and bundle optimizations out of the box.
