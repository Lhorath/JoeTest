import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import {
  UpgradeSubmissionDto,
  UpgradeSubmissionResponse,
  QueueStatus,
  LiveSessionStatus,
} from "@platform/types";
import { allowMockPayments, createPriorityPaymentIntent } from "@/lib/stripe-server";
import {
  hostCanAcceptPriorityPayments,
  rememberPaymentHold,
  resolveStationHostUserId,
} from "@/lib/payment-settlement";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieHeader = req.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader);
  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const submission = serverDb.submissions.get(params.id);
  if (!submission) {
    return NextResponse.json(
      { message: "Submission not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  // Authorization check
  if (submission.submittingUserId !== user.id) {
    return NextResponse.json(
      { message: "Forbidden: You do not own this submission", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  // Only non-priority submissions can be upgraded
  if (submission.isPriority) {
    return NextResponse.json(
      { message: "Submission is already a priority submission", code: "ALREADY_PRIORITY" },
      { status: 409 },
    );
  }

  // Only QUEUED submissions can be upgraded (not playing, completed, or skipped)
  if (submission.currentQueueStatus !== QueueStatus.QUEUED) {
    return NextResponse.json(
      { message: "Only queued submissions can be upgraded to Priority", code: "INVALID_STATUS" },
      { status: 409 },
    );
  }

  const session = serverDb.sessions.get(submission.liveSessionId);
  if (!session || session.status !== LiveSessionStatus.LIVE) {
    return NextResponse.json(
      { message: "Live session is not currently active", code: "SESSION_NOT_LIVE" },
      { status: 409 },
    );
  }

  const body: UpgradeSubmissionDto = await req.json();

  const selectedTier = session?.tiers?.find(
    (t) => t.tierSnapshotId === body.tierSnapshotId,
  );

  if (!selectedTier) {
    return NextResponse.json(
      { message: "Invalid priority tier", code: "INVALID_TIER" },
      { status: 400 },
    );
  }

  if (!allowMockPayments()) {
    const hostUserId = resolveStationHostUserId(session.stationId);
    const payout = hostUserId ? serverDb.payoutAccounts.get(hostUserId) : undefined;
    if (!hostUserId || !payout || !hostCanAcceptPriorityPayments(hostUserId)) {
      return NextResponse.json(
        {
          message: "This host cannot accept priority payments yet",
          code: "HOST_PAYOUTS_NOT_READY",
        },
        { status: 409 },
      );
    }
    const queue = serverDb.queues.get(submission.liveSessionId) || [];
    const entry = queue.find((item) => item.submissionId === submission.id);
    try {
      const created = await createPriorityPaymentIntent({
        amountCents: selectedTier.priceCents,
        connectedAccountId: payout.providerAccountId,
        submissionId: submission.id,
        liveSessionId: submission.liveSessionId,
        tierSnapshotId: selectedTier.tierSnapshotId,
        userId: user.id,
      });
      rememberPaymentHold({
        paymentIntentId: created.paymentIntentId,
        submissionId: submission.id,
        liveSessionId: submission.liveSessionId,
        queueEntryId: entry?.id || submission.id,
        tierSnapshotId: selectedTier.tierSnapshotId,
        amountCents: selectedTier.priceCents,
        connectedAccountId: payout.providerAccountId,
        kind: "upgrade",
      });
      const response: UpgradeSubmissionResponse = {
        submission: {
          id: submission.id,
          submittingUserId: submission.submittingUserId,
          sourceTrackId: submission.sourceTrackId,
          artistIdentityId: submission.artistIdentityId,
          liveSessionId: submission.liveSessionId,
          isPriority: false,
          priorityTierSnapshotId: null,
          currentQueueStatus: submission.currentQueueStatus,
          submittedAt: submission.submittedAt,
        },
        queueEntry: {
          id: entry?.id || submission.id,
          liveSessionId: submission.liveSessionId,
          submissionId: submission.id,
          status: submission.currentQueueStatus,
          priorityRank: entry?.priorityRank || 0,
          sortOrder: entry?.sortOrder || 1,
        },
        clientSecret: created.clientSecret,
      };
      return NextResponse.json(response);
    } catch {
      return NextResponse.json(
        { message: "Payment could not be started", code: "PAYMENT_UNAVAILABLE" },
        { status: 503 },
      );
    }
  }

  submission.isPriority = true;
  submission.tierName = selectedTier.name;
  submission.tierColorSlot = selectedTier.colorSlot;

  // Update corresponding queue entry and re-sort queue
  const queue = serverDb.queues.get(submission.liveSessionId) || [];
  const entryIndex = queue.findIndex((e) => e.submissionId === submission.id);

  let updatedQueueEntry = queue[entryIndex];
  if (entryIndex !== -1 && updatedQueueEntry) {
    updatedQueueEntry.isPriority = true;
    updatedQueueEntry.priorityRank = selectedTier.priorityRank;
    updatedQueueEntry.tierName = selectedTier.name;
    updatedQueueEntry.colorSlot = selectedTier.colorSlot;

    // Re-sort: remove and re-insert by priority rank
    queue.splice(entryIndex, 1);
    let insertIndex = queue.findIndex(
      (e) =>
        e.status === updatedQueueEntry.status &&
        e.priorityRank < selectedTier.priorityRank,
    );
    if (insertIndex === -1) {
      insertIndex = queue.length;
    }
    queue.splice(insertIndex, 0, updatedQueueEntry);
    queue.forEach((item, idx) => {
      item.sortOrder = idx + 1;
    });
    serverDb.queues.set(submission.liveSessionId, queue);
  }

  const response: UpgradeSubmissionResponse = {
    submission: {
      id: submission.id,
      submittingUserId: submission.submittingUserId,
      sourceTrackId: submission.sourceTrackId,
      artistIdentityId: submission.artistIdentityId,
      liveSessionId: submission.liveSessionId,
      isPriority: true,
      priorityTierSnapshotId: body.tierSnapshotId,
      currentQueueStatus: submission.currentQueueStatus,
      submittedAt: submission.submittedAt,
    },
    queueEntry: updatedQueueEntry
      ? {
          id: updatedQueueEntry.id,
          liveSessionId: updatedQueueEntry.liveSessionId,
          submissionId: updatedQueueEntry.submissionId,
          status: updatedQueueEntry.status,
          priorityRank: updatedQueueEntry.priorityRank,
          sortOrder: updatedQueueEntry.sortOrder,
        }
      : {
          id: submission.id,
          liveSessionId: submission.liveSessionId,
          submissionId: submission.id,
          status: submission.currentQueueStatus,
          priorityRank: selectedTier.priorityRank,
          sortOrder: 1,
        },
    clientSecret: `pi_mock_upgrade_secret_${submission.id}`, // fixture-only; production returns above
  };

  return NextResponse.json(response);
}
