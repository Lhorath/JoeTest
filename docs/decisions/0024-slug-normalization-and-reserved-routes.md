# ADR 0024: Public Host Pages, Case-Insensitive Slug Normalization, and Reserved Route Protection

## Status

Accepted

## Context

Each approved livestream host on **TheQueue** (thequeue.live) needs a unique, clean public host page located at `https://thequeue.live/{hostSlug}` where standard users can open live feeds, view active queues, and submit tracks.

We need to guarantee:

1. Slugs are unique case-insensitively, preventing hijacking or confusingly similar URLs (e.g. `/emerald` vs `/Emerald`).
2. Hosts cannot select slugs that conflict with reserved core application routes (like `/admin`, `/api`, `/uploads`, `/login`).
3. If a host changes their public slug, existing shared livestream links are not permanently broken and can be redirect-mapped.

## Decision

We implement a case-insensitive slug lookup strategy, a centralized reserved slug registry, and a dedicated redirect-history tracking table:

1. **Case-Insensitive Uniqueness**:
   - We store the host's preferred display capitalization in `hostSlug` (e.g., `Emerald`).
   - We store a fully lowercased and trimmed value in `normalizedHostSlug` (e.g., `emerald`).
   - We enforce uniqueness directly in PostgreSQL via a unique database index:
     `CREATE UNIQUE INDEX "host_profiles_normalizedHostSlug_key" ON "host_profiles"("normalizedHostSlug");`

2. **Reserved Route Safeguard**:
   - We maintain a centralized array of protected keywords (`RESERVED_SLUGS`) inside our shared validation package (`@platform/validation`).
   - The list includes: `admin`, `api`, `host`, `login`, `register`, `account`, `settings`, `legal`, `privacy`, `terms`, `support`, `about`, `live`, `stations`, `music`, `queue`, and `uploads`.
   - Zod validation and application service layers block these keywords.

3. **Redirect History Preservation**:
   - We track all slug modifications historically inside the `HostSlugHistory` model.
   - This records the previous slug, new slug, actors, timestamps, and whether redirect is active.
   - The application layer can use this table to issue permanent `301 redirects` when old links are visited.

## Consequences

- **Pros**:
  - Absolute protection of platform system routing against accidental host slug conflicts.
  - Safe case-insensitive lookups, preventing confusion.
  - Bulletproof link-rot defense using redirect histories.
- **Cons**:
  - Requires maintaining the central reserved routes list as the application grows (documented in development guides).
