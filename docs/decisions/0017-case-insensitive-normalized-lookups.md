# ADR 0017: Case-Insensitive Normalized Search Fields

## Status

Approved

## Context

Standard text fields in databases are case-sensitive by default (e.g. `User@TheQueue.com` is different from `user@thequeue.com` during lookup), which leads to duplicate records, slow queries during searches, and buggy matching logic.

## Decision

We enforce dedicated case-insensitive normalized columns for all key searchable fields:

- `normalizedEmail` (lowercased email)
- `normalizedUsername` (lowercased username)
- `normalizedArtistName` (lowercased artist name)
- `normalizedSongName` (lowercased song name)
- `normalizedStationName` (lowercased station name)
- `normalizedHostName` (lowercased host name)
- Unique and high-traffic compound indexes are mapped specifically to these normalized columns.

## Consequences

- 100% reliable duplication checks on emails, usernames, and tracks.
- Blazing-fast search lookups with zero runtime lowercasing database operations.
- Clean database-level indexing.
