# ADR 0009: Tailwind CSS v4 Shared Design System

## Status

Approved

## Context

All three frontend applications must maintain an identical, polished, dark-first styling language, avoiding duplicate CSS rules.

## Decision

We adopt **Tailwind CSS v4** combined with React, exposing a raw source CSS file (`@platform/ui/styles.css`) containing shared themes, variables, and base components, allowing Next.js to scan and compile them locally.

## Consequences

- Fast, utility-first CSS compilation without redundant style files.
- Single source of truth for colors, spacing, and focus states.
- Clean development workflow with zero complex build systems inside `@platform/ui`.
