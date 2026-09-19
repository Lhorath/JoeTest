# ADR 0008: S3-Compatible Object Storage

## Status

Approved

## Context

Storing large audio files and image artwork inside relational databases or local server filesystems hinders scalability and degrades performance.

## Decision

We utilize **S3-compatible Object Storage** (e.g., MinIO for local development, AWS S3 or Cloudflare R2 for production) for all user-uploaded media files.

## Consequences

- Infinite asset scaling independent of server storage.
- Highly secure asset upload flows using secure, temporary, S3 pre-signed URLs.
- Decoupled media workflows.
