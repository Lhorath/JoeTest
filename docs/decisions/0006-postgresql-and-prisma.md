# ADR 0006: PostgreSQL and Prisma ORM

## Status

Approved

## Context

Our domain data (users, payments, submission tracks, audits) requires rich relational associations, strict transactional boundaries, and robust indices.

## Decision

We select **PostgreSQL** as our single primary datastore, combined with **Prisma ORM** for query building and schema migrations.

## Consequences

- ACID compliance and rich indexing out of the box.
- Strict database-schema definitions mapped seamlessly to TypeScript types.
- Safer operations via Prisma's query parameterization.
