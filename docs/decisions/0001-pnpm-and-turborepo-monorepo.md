# ADR 0001: Choice of pnpm Workspaces and Turborepo Monorepo

## Status

Approved

## Context

We need to manage multiple web applications, backend APIs, workers, and shared logic modules concurrently. Duplicating code or maintaining multiple independent repositories introduces drift, makes dependency upgrades tedious, and slows down local dev loops.

## Decision

We choose a single TypeScript monorepo configured with **pnpm workspaces** for package linking, and **Turborepo** for concurrent task orchestrations and artifact caching.

## Consequences

- Clean package isolation inside a single repository.
- Sub-second task orchestrations using Turborepo's execution graphs.
- Fast dependency installations and low disk space footprint via pnpm.
