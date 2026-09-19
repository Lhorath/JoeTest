# ADR 0003: Separate Web, Host, and Admin Applications

## Status

Approved

## Context

Standard listeners, live stream hosts, and system administrators have completely distinct UI, routing, performance, and security profiles. Bundling all three groups into a single monolithic app increases bundle sizes and complicates route guards.

## Decision

We split the frontends into three dedicated Next.js applications:

- `apps/web`: Public landing pages and track uploader dashboard.
- `apps/host`: Broadcaster dashboard, DJ controls, and overlay configuration.
- `apps/admin`: Administrator headquarters and reviews.

## Consequences

- Smaller bundles and optimized rendering paths.
- Strong domain boundary segregation (e.g. `host.example.com` and `admin.example.com`).
- Clean separation of concern and layout design patterns.
