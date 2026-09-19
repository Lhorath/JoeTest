# ADR 0004: NestJS Framework for Backend API

## Status

Approved

## Context

We require a highly structured, scalable, and maintainable backend API. Simple express layouts quickly decay into unmaintainable spaghetti code without dependency injection and modular patterns.

## Decision

We select **NestJS** as the core backend API framework.

## Consequences

- Strict, out-of-the-box dependency injection (DI) patterns.
- Strong cohesion through modular, decoupled features.
- Seamless automatic integration with Swagger/OpenAPI.
