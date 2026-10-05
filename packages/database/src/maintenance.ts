import {
  LiveSessionStatus,
  Prisma,
  PrismaClient,
  QueueStatus,
  ReservationStatus,
} from "@prisma/client";
import { uuidv7 } from "uuidv7";

function generateUuidV7(): string {
  return uuidv7();
}

const INACTIVITY_MS = 60 * 60 * 1000;
const ACTIVE_QUEUE_STATUSES: QueueStatus[] = [
  QueueStatus.QUEUED,
  QueueStatus.NEXT,
  QueueStatus.PLAYING,
  QueueStatus.PAUSED,
  QueueStatus.AWAITING_PAYMENT,
];

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Ends live sessions with no playback activity for 60 minutes.
 * Queue rows are preserved. Submissions are closed. The session status
 * history and queue events record AUTO_ENDED_INACTIVITY.
 */
export async function endInactiveLiveSessions(
  client: PrismaClient,
  now: Date = new Date(),
): Promise<string[]> {
  const cutoff = new Date(now.getTime() - INACTIVITY_MS);
  const candidates = await client.liveSession.findMany({
    where: {
      status: LiveSessionStatus.LIVE,
      lastPlaybackActivityAt: { lt: cutoff },
    },
    select: { id: true },
  });

  const ended: string[] = [];
  for (const session of candidates) {
    const didEnd = await client.$transaction(async (tx) =>
      endSessionIfInactive(tx, session.id, cutoff, now),
    );
    if (didEnd) ended.push(session.id);
  }
  return ended;
}

async function endSessionIfInactive(
  tx: DbClient,
  liveSessionId: string,
  cutoff: Date,
  now: Date,
): Promise<boolean> {
  const updated = await tx.liveSession.updateMany({
    where: {
      id: liveSessionId,
      status: LiveSessionStatus.LIVE,
      lastPlaybackActivityAt: { lt: cutoff },
    },
    data: {
      status: LiveSessionStatus.ENDED,
      endedAt: now,
      submissionsOpen: false,
      freeLineOpen: false,
      paidSubmissionsOpen: false,
      queueRevision: { increment: 1 },
    },
  });
  if (updated.count === 0) return false;

  await tx.liveSessionStatusHistory.create({
    data: {
      id: generateUuidV7(),
      liveSessionId,
      previousStatus: LiveSessionStatus.LIVE,
      newStatus: LiveSessionStatus.ENDED,
    },
  });

  const entries = await tx.queueEntry.findMany({
    where: {
      liveSessionId,
      status: { in: ACTIVE_QUEUE_STATUSES },
    },
    select: { id: true, status: true },
  });
  const latest = await tx.queueEvent.findFirst({
    where: { liveSessionId },
    orderBy: { eventSequence: "desc" },
    select: { eventSequence: true },
  });
  let sequence = latest?.eventSequence ?? 0;
  for (const entry of entries) {
    sequence += 1;
    await tx.queueEvent.create({
      data: {
        id: generateUuidV7(),
        queueEntryId: entry.id,
        liveSessionId,
        actingUserId: null,
        eventType: "AUTO_ENDED_INACTIVITY",
        previousState: entry.status,
        newState: entry.status,
        reason:
          "Live session ended after 60 minutes without playback activity. Queue preserved and submissions closed.",
        eventSequence: sequence,
        publicVisibility: true,
      },
    });
  }
  return true;
}

/** Marks expired priority reservations so capacity can be reused. */
export async function expirePriorityReservations(
  client: PrismaClient,
  now: Date = new Date(),
): Promise<number> {
  const result = await client.priorityTierReservation.updateMany({
    where: {
      status: ReservationStatus.ACTIVE,
      expiresAt: { lt: now },
    },
    data: {
      status: ReservationStatus.EXPIRED,
      releasedAt: now,
    },
  });
  return result.count;
}
