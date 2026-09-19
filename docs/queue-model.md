# Queue System & Submission State Machine - TheQueue

The queue is the operational core of **TheQueue** (thequeue.live). It maps out track sequence numbers, manual host reordering weights, and status transitions, backed by an append-only event trail.

---

## 1. Submission & Queue State Transitions

A track submission moves through standard states:

```text
               ┌──────────────────────┐
               │   AWAITING_PAYMENT   │
               └──────────┬───────────┘
                          │ (Payment captured)
                          ▼
                    ┌────────────┐
             ┌─────►│   QUEUED   │◄─────┐
             │      └─────┬──────┘      │
             │            │ (Mark next) │ (Reordered)
             │            ▼             │
             │      ┌────────────┐      │
             │      │    NEXT    │──────┘
             │      └─────┬──────┘
             │            │ (Play track)
             │            ▼
             │      ┌────────────┐
             │      │  PLAYING   │
             │      └─────┬──────┘
             │            │ (Complete, skip, reject)
             │            ▼
             │      ┌────────────┐
             │      │ COMPLETED  │
             │      │  SKIPPED   │
             │      │  REJECTED  │
             │      └────────────┘
             │ (Carryover)
             └─────────────────── QueueStatus: CARRIED_OVER
```

---

## 2. Priority Sorting and Manual Reordering Mechanics

To keep queue indices fast and reliable under high concurrent request volume:

- **`priorityRank`**: A copy of the priority-tier rank (higher = placed first). Standard Free Line submissions default to 0.
- **`queueSequence`**: A chronologically increasing global counter assigned upon entry.
- **`manualSortOrder`**: An offset counter changed when a stream host manually drags and drops a track to reorder.
- **Sorting Logic**:
  ```sql
  SELECT * FROM "queue_entries"
  WHERE "liveSessionId" = :live_session_id AND "status" = 'QUEUED'
  ORDER BY "priorityRank" DESC, "manualSortOrder" ASC, "queueSequence" ASC;
  ```
- This ensures that high-priority tiers always sort first, while allowing the host to reorder tracks within tier boundaries easily without complex recursive queries.

To support infinite reinsertion at the top of the queue and custom order overrides without fragile integers, we use a **Decimal Ordering Key Strategy** (`sortOrder` column of type `DECIMAL(20, 8)`). Active queue entries can be re-sorted by computing fractional sort order positions:
$$\text{New Sort Order} = \frac{\text{Previous Entry's sortOrder} + \text{Next Entry's sortOrder}}{2}$$
This allows deterministic positioning, batch insertions, and reinsertion at the top of the queue cleanly by allocating negative sort order positions (e.g. `Min(sortOrder) - 1.0`).

---

## 3. Play Next, Batch History, and Reinsertion Architecture

TheQueue provides comprehensive tools for host queue-history management:

### A. Play Next Transition Lifecycle

When the host executes a "Play Next" action:

1. The currently playing queue entry is finalized (`wasPlayed = true`, `playbackCompleted = true`, and state moves to `COMPLETED`).
2. The item transitions out of the active queue and is logged into the live session's history as a completed status (`COMPLETED` or `SKIPPED`). No track or queue entry is deleted.
3. The next eligible queue entry is selected using deterministic sort order and rank, transitioning to `PLAYING`.
4. Relevant `QueueEvent` records (`PLAY_NEXT_REQUESTED`, `CURRENT_ENTRY_COMPLETED`, `ENTRY_MOVED_TO_HISTORY`, `NEXT_ENTRY_SELECTED`, `PLAYBACK_STARTED`) are logged.

### B. Moving Selected Entries to History (Batch Actions)

Broadcasters can batch-move multiple items to history:

- Transitioned entries update their state to `MOVED_TO_HISTORY`.
- A single `QueueBatchOperation` metadata record is created (`MOVE_TO_HISTORY` type) representing the selection.
- Individual, append-only `QueueEvent` records are logged for each affected entry referencing the batch operation ID for correlation.

### C. Queue Reinsertion

A previously played, skipped, or removed historical song can be reinserted directly at the top of the active queue:

- **No Duplication**: Reinsertion reuses the same original `Submission`, `QueueEntry`, and `TrackSnapshot`.
- **History Retention**: Historical events remain fully queryable. The previous completion sequence is preserved while a new `HISTORY_ENTRY_REINSERTED` event is logged.
- **Top Insertion**: The reinserted entry's `sortOrder` is allocated below the current minimum active sort order (e.g., `Min(sortOrder) - 1.0`), placing it instantly at the top of the queue.

---

## 4. Public Queue Visibility & Privacy Configuration

To prevent exposing private customer details (like emails, legal names, risk signals, or Stripe indicators) on the public host-facing queue pages, hosts can configure explicit visibility parameters (`Station.publicQueueVisibilityMode`).

The system offers settings like:

- `SHOW_FULL_TRACK_INFORMATION`: Displays artwork, song name, artist name, and priority badges.
- `SHOW_ARTIST_ONLY`: Omit song titles and artwork, showing artist names and positions only.
- `SHOW_POSITION_ONLY`: Completely conceals track metadata, showing numbered queue spots only.
- `HIDE_PUBLIC_QUEUE`: Restricts the queue entirely from public views.

Additionally, fine-grained booleans (`showArtworkPublicly`, `showArtistNamePublicly`, etc.) allow custom toggles. These settings are copied/snapshotted directly into `LiveSessionSettingsSnapshot` to protect the historical configuration profile of each live session.

---

## 5. Ordered Real-time Event Sequencing

To support high-performance live queue updates (via Socket.IO or polling) without complete page reloads, the system implements an ordered sequential synchronization design:

- **Monotonically Increasing Revision (`queueRevision`)**: Tracked on `LiveSession`. Every change that alters queue state, positions, or availability increases this counter by 1.
- **Ordered Event Sequence (`eventSequence`)**: Tracked on each `QueueEvent` record. Events must be unique per live session:
  $$\text{Unique Constraint} = (\text{liveSessionId}, \text{eventSequence})$$
- This allows client-side players or mobile views to detect missing, out-of-order, or duplicate events, and trigger a complete fresh queue projection refresh only when reconnection gaps are detected.

---

## 6. Append-Only Queue Event Log

Every single action taken on the queue is logged in the `QueueEvent` table:

- It tracks the acting user, event type (`REORDER`, `PLAY`, `SKIP`, `REJECT`, `HISTORY_ENTRY_REINSERTED`), state transitions, position offsets, and host-facing reasons.
- Supports correlation fields: `batchOperationId`, `requestId`, and `correlationId` to trace complex operations.
- Integrates `eventSequence` and `publicVisibility` flags to safely stream DTO projections to public clients.
- This represents an audit log for host queue interactions, preventing disputes and verifying platform billing.

---

## 7. Future Transactional Requirements (NestJS Services)

When NestJS services are implemented for queue actions in subsequent milestones, the following transactional safeguards are required to protect data integrity:

### Play Next Transaction Requirements:

1. **Pessimistic Lock**: Lock the `LiveSession` or station playback state to prevent concurrent modifications.
2. **Retrieve Current**: Fetch and verify the current playing `QueueEntry`.
3. **Finalize Playback**: Complete the currently open `PlaybackSession` and set completion metrics.
4. **Transition Current**: Update current entry's status to `COMPLETED` and append `ENTRY_MOVED_TO_HISTORY` event.
5. **Fetch Next**: Select the next highest-priority active entry (`QUEUED` or `NEXT`) using deterministic `sortOrder` ordering.
6. **Activate Next**: Update next entry status to `PLAYING` and start a new `PlaybackSession`.
7. **Write Log**: Write all queue and playback events atomically.

### Batch Movement Transaction Requirements:

1. **Pessimistic Lock**: Lock all selected active `QueueEntries`.
2. **Host and Session Validation**: Verify all selected entries belong to the same live session and host.
3. **Create Batch Record**: Write a `QueueBatchOperation` tracking `MOVE_TO_HISTORY`.
4. **Bulk Update**: Transition all affected entries to `MOVED_TO_HISTORY` and set metadata fields (`movedToHistoryAt`, `batchOperationId`, etc.).
5. **Write Events**: Write an individual `QueueEvent` for every moved entry atomically.

### Reinsertion Transaction Requirements:

1. **Lock Entry**: Lock the selected historical `QueueEntry`.
2. **State Validation**: Ensure the entry is currently inactive/historical (e.g., `COMPLETED`, `SKIPPED`, `MOVED_TO_HISTORY`).
3. **Allocate Order**: Compute the top of the queue sort order (`Min(sortOrder) - 1.0`).
4. **Activate**: Update status back to `QUEUED` and set `sortOrder`.
5. **Write Events**: Log the `HISTORY_ENTRY_REINSERTED` event atomically.
