import { createHash, randomUUID } from "crypto";
import type Stripe from "stripe";
import { QueueStatus } from "@platform/types";
import { serverDb, StoredQueueEntry } from "./server-state";
import { getStripe, webhookSecret } from "./stripe-server";

export interface PaymentHold {
  paymentIntentId: string;
  submissionId: string;
  liveSessionId: string;
  queueEntryId: string;
  tierSnapshotId: string;
  amountCents: number;
  connectedAccountId: string;
  kind: "submission" | "upgrade";
}

const holds = new Map<string, PaymentHold>();
const processedEvents = new Set<string>();

export function rememberPaymentHold(hold: PaymentHold) {
  holds.set(hold.paymentIntentId, hold);
}

export function hostCanAcceptPriorityPayments(userId: string): boolean {
  const payout = serverDb.payoutAccounts.get(userId);
  return Boolean(
    payout &&
      payout.chargesEnabled &&
      payout.payoutsEnabled &&
      payout.detailsSubmitted &&
      payout.providerAccountId.startsWith("acct_"),
  );
}

export function resolveStationHostUserId(stationId: string): string | null {
  const station = serverDb.stations.get(stationId);
  if (!station) return null;
  const profile = serverDb.hostProfiles.get(station.hostId);
  return profile?.userId || null;
}

function placePriorityEntry(liveSessionId: string, entry: StoredQueueEntry) {
  const queue = serverDb.queues.get(liveSessionId) || [];
  const existing = queue.findIndex((item) => item.id === entry.id);
  if (existing >= 0) queue.splice(existing, 1);
  let insertIndex = queue.findIndex(
    (item) =>
      item.status === QueueStatus.QUEUED && item.priorityRank < entry.priorityRank,
  );
  if (insertIndex === -1) insertIndex = queue.length;
  queue.splice(insertIndex, 0, entry);
  queue.forEach((item, index) => {
    item.sortOrder = index + 1;
  });
  serverDb.queues.set(liveSessionId, queue);
}

export function activatePaidSubmission(paymentIntentId: string): boolean {
  const hold = holds.get(paymentIntentId);
  if (!hold) return false;
  const submission = serverDb.submissions.get(hold.submissionId);
  const session = serverDb.sessions.get(hold.liveSessionId);
  if (!submission || !session) return false;

  const tier = session.tiers?.find((item) => item.tierSnapshotId === hold.tierSnapshotId);
  submission.isPriority = true;
  submission.currentQueueStatus = QueueStatus.QUEUED;
  submission.tierName = tier?.name || submission.tierName;
  submission.tierColorSlot = tier?.colorSlot || submission.tierColorSlot;
  if (submission.queueEntry) {
    submission.queueEntry.status = QueueStatus.QUEUED;
    submission.queueEntry.priorityRank = tier?.priorityRank || submission.queueEntry.priorityRank;
  }

  const queue = serverDb.queues.get(hold.liveSessionId) || [];
  const entry = queue.find((item) => item.id === hold.queueEntryId);
  if (entry) {
    entry.status = QueueStatus.QUEUED;
    entry.isPriority = true;
    entry.priorityRank = tier?.priorityRank || entry.priorityRank;
    entry.tierName = tier?.name || entry.tierName;
    entry.colorSlot = tier?.colorSlot || entry.colorSlot;
    placePriorityEntry(hold.liveSessionId, entry);
  }
  session.queueRevision = (session.queueRevision || 0) + 1;
  holds.delete(paymentIntentId);
  return true;
}

export function failPaidSubmission(paymentIntentId: string) {
  const hold = holds.get(paymentIntentId);
  if (!hold) return;
  const submission = serverDb.submissions.get(hold.submissionId);
  if (submission) submission.currentQueueStatus = QueueStatus.EXPIRED;
  const queue = serverDb.queues.get(hold.liveSessionId) || [];
  const remaining = queue.filter((item) => item.id !== hold.queueEntryId);
  remaining.forEach((item, index) => {
    item.sortOrder = index + 1;
  });
  serverDb.queues.set(hold.liveSessionId, remaining);
  holds.delete(paymentIntentId);
}

async function claimEvent(eventId: string, eventType: string): Promise<boolean> {
  if (processedEvents.has(eventId)) return false;
  processedEvents.add(eventId);
  try {
    const { prisma, generateUuidV7 } = await import("@platform/database");
    await prisma.paymentProviderEvent.create({
      data: {
        id: generateUuidV7(),
        providerEventId: eventId,
        eventType,
        payloadHash: createHash("sha256").update(eventId).digest("hex"),
        payloadText: JSON.stringify({ id: eventId, type: eventType }),
        processingState: "COMPLETED",
        processedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") return false;
    if (process.env.NODE_ENV === "production") {
      processedEvents.delete(eventId);
      throw error;
    }
  }
  return true;
}

export async function handleStripeWebhook(payload: string, signature: string) {
  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret());
  const claimed = await claimEvent(event.id, event.type);
  if (!claimed) return { duplicate: true };

  if (
    event.type !== "payment_intent.succeeded" &&
    event.type !== "payment_intent.payment_failed" &&
    event.type !== "payment_intent.canceled"
  ) {
    return { ignored: true };
  }

  const intent = event.data.object as Stripe.PaymentIntent;
  if (intent.object !== "payment_intent") return { ignored: true };

  if (event.type === "payment_intent.succeeded") {
    const activated = activatePaidSubmission(intent.id);
    if (!activated && intent.metadata?.submissionId) {
      const submission = serverDb.submissions.get(intent.metadata.submissionId);
      if (submission) {
        rememberPaymentHold({
          paymentIntentId: intent.id,
          submissionId: submission.id,
          liveSessionId: submission.liveSessionId,
          queueEntryId: submission.queueEntry?.id || randomUUID(),
          tierSnapshotId: intent.metadata.tierSnapshotId || "",
          amountCents: intent.amount,
          connectedAccountId: "",
          kind: "submission",
        });
        activatePaidSubmission(intent.id);
      }
    }
  } else {
    failPaidSubmission(intent.id);
  }

  return { received: true };
}
