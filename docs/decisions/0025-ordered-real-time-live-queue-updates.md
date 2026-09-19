# ADR 0025: Live Queue Updates and Ordered Real-Time Sequencing

## Status

Accepted

## Context

Standard public users viewing a broadcaster's livestream page expect queue positions, currently playing items, and tier configurations to update in real-time without requiring a complete page reload.

In high-concurrency environments with intermittent network dropouts or mobile reconnections, simple pub/sub message brokers are vulnerable to:

- Missing incremental update events.
- Receiving events out of order.
- Inability to verify client synchronization state.

We need a database foundation that supports ordered, reliable, and auditable real-time update sequencing.

## Decision

We enforce a dual-sequencing system at the database level using monotonically increasing session revisions and unique ordered event sequence indexes.

### Implementation Details:

1. **Live Session Queue Revision (`queueRevision`)**:
   - `LiveSession` maintains a `queueRevision` integer column.
   - Any transaction that changes the state, order, or composition of a session's queue increments this revision by exactly 1 (`queueRevision = queueRevision + 1`).
   - The timestamp of the last revision is preserved in `publicQueueUpdatedAt`.

2. **Ordered Queue Event Sequence (`eventSequence`)**:
   - Every `QueueEvent` represents an immutable state change.
   - We assign a sequential index `eventSequence` per event.
   - We enforce uniqueness per live session directly in PostgreSQL:
     `CREATE UNIQUE INDEX "queue_events_liveSessionId_eventSequence_key" ON "queue_events"("liveSessionId", "eventSequence");`

3. **Reconnection & Sync Mechanics**:
   - Real-time client connections first pull a complete DTO queue snapshot labeled with the latest `queueRevision` (e.g. `Revision 10`).
   - Incremental socket frames stream ordered events.
   - If a client misses an event or receives an event sequence gap (e.g. gets `Revision 13` but last was `Revision 11`), they immediately detect the gap and request a full queue DTO refresh.

## Consequences

- **Pros**:
  - Extremely robust real-time syncing. Clients can autonomously detect out-of-order frames and reconnections.
  - Highly secure: No private submission, payment, or moderation data is ever transmitted; public-safe events are derived safely using projection.
- **Cons**:
  - Requires the future NestJS transaction layer to increment `queueRevision` on every write, which we explicitly document.
