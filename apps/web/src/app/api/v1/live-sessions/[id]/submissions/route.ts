import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  StoredQueueEntry,
  StoredSubmission,
} from "@/lib/server-state";
import {
  CreateSubmissionDto,
  CreateSubmissionResponse,
  QueueStatus,
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
  const sessionId = params.id;
  const session = serverDb.sessions.get(sessionId);
  if (!session) {
    return NextResponse.json(
      { message: "Live session not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const cookieHeader = req.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader);
  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body: CreateSubmissionDto = await req.json();
  const track = serverDb.tracks.get(body.sourceTrackId);

  if (!track) {
    return NextResponse.json(
      { message: "Track not found in user library", code: "TRACK_NOT_FOUND" },
      { status: 400 },
    );
  }

  // Resolve Artist Identity:
  // 1. Explicit body override: if provided (string or null)
  // 2. Fall back to track's artistIdentityId
  let resolvedArtistIdentityId: string | null = null;
  let resolvedArtistName: string = track.artistIdentity?.artistName || track.songName;
  let resolvedSpotifyUrl: string | null = null;

  if (body.artistIdentityId !== undefined) {
    if (body.artistIdentityId && body.artistIdentityId !== "none") {
      const identity = serverDb.artistIdentities.get(body.artistIdentityId);
      if (!identity || identity.deletedAt) {
        return NextResponse.json(
          { message: "Selected Artist Identity not found", code: "ARTIST_NOT_FOUND" },
          { status: 404 },
        );
      }
      // Authorization check: Submitting user must own the Artist Identity
      if (user && identity.userId !== user.id) {
        return NextResponse.json(
          { message: "Forbidden: You cannot submit under an Artist Identity you do not own.", code: "FORBIDDEN" },
          { status: 403 },
        );
      }
      resolvedArtistIdentityId = identity.id;
      resolvedArtistName = identity.artistName;
      resolvedSpotifyUrl = identity.spotifyUrl || null;
    } else {
      // Explicit "No Artist"
      resolvedArtistIdentityId = null;
      resolvedArtistName = track.songName;
      resolvedSpotifyUrl = null;
    }
  } else if (track.artistIdentityId) {
    const identity = serverDb.artistIdentities.get(track.artistIdentityId);
    if (identity && !identity.deletedAt) {
      resolvedArtistIdentityId = identity.id;
      resolvedArtistName = identity.artistName;
      resolvedSpotifyUrl = identity.spotifyUrl || null;
    } else if (track.artistIdentity?.artistName) {
      resolvedArtistName = track.artistIdentity.artistName;
      resolvedSpotifyUrl = track.artistIdentity.spotifyUrl || null;
    }
  }

  const isPriority = Boolean(body.tierSnapshotId);
  const selectedTier = isPriority
    ? session.tiers?.find((t) => t.tierSnapshotId === body.tierSnapshotId)
    : null;

  const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const queueEntryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const priorityRank = selectedTier ? selectedTier.priorityRank : 0;

  const queue = serverDb.queues.get(sessionId) || [];
  const nextSortOrder = queue.length + 1;

  const newQueueEntry: StoredQueueEntry = {
    id: queueEntryId,
    liveSessionId: sessionId,
    submissionId,
    submittingUserId: user.id,
    sourceTrackId: track.id,
    artistIdentityId: resolvedArtistIdentityId,
    spotifyUrl: resolvedSpotifyUrl,
    status: QueueStatus.QUEUED,
    sortOrder: nextSortOrder,
    priorityRank,
    isPriority,
    tierName: selectedTier ? selectedTier.name : null,
    colorSlot: selectedTier ? selectedTier.colorSlot : "FREE_LINE",
    songName: track.songName,
    artistName: resolvedArtistName,
    durationSeconds: track.durationSeconds,
    submittedAt: new Date().toISOString(),
  };

  const useStripe = isPriority && !allowMockPayments();
  const hostUserId = useStripe ? resolveStationHostUserId(session.stationId) : null;
  if (useStripe) {
    if (!selectedTier) {
      return NextResponse.json(
        { message: "Invalid priority tier", code: "INVALID_TIER" },
        { status: 400 },
      );
    }
    if (!hostUserId || !hostCanAcceptPriorityPayments(hostUserId)) {
      return NextResponse.json(
        {
          message: "This host cannot accept priority payments yet",
          code: "HOST_PAYOUTS_NOT_READY",
        },
        { status: 409 },
      );
    }
    newQueueEntry.status = QueueStatus.AWAITING_PAYMENT;
    newQueueEntry.isPriority = false;
    queue.push(newQueueEntry);
  } else if (isPriority) {
    let insertIndex = queue.findIndex(
      (e) => e.status === QueueStatus.QUEUED && e.priorityRank < priorityRank,
    );
    if (insertIndex === -1) insertIndex = queue.length;
    queue.splice(insertIndex, 0, newQueueEntry);
    queue.forEach((item, idx) => {
      item.sortOrder = idx + 1;
    });
  } else {
    queue.push(newQueueEntry);
  }
  serverDb.queues.set(sessionId, queue);

  const newSubmission: StoredSubmission = {
    id: submissionId,
    submittingUserId: user.id,
    sourceTrackId: track.id,
    artistIdentityId: resolvedArtistIdentityId,
    spotifyUrl: resolvedSpotifyUrl,
    liveSessionId: sessionId,
    sessionTitle: session.liveTitle,
    sessionStatus: session.status,
    stationName: session.stationName,
    songName: track.songName,
    artistName: resolvedArtistName,
    durationSeconds: track.durationSeconds,
    isPriority: useStripe ? false : isPriority,
    tierName: selectedTier ? selectedTier.name : null,
    tierColorSlot: selectedTier ? selectedTier.colorSlot : null,
    currentQueueStatus: useStripe ? QueueStatus.AWAITING_PAYMENT : QueueStatus.QUEUED,
    submittedAt: new Date().toISOString(),
    queueEntry: {
      id: queueEntryId,
      status: useStripe ? QueueStatus.AWAITING_PAYMENT : QueueStatus.QUEUED,
      priorityRank,
      sortOrder: newQueueEntry.sortOrder,
    },
  };

  serverDb.submissions.set(submissionId, newSubmission);

  let clientSecret: string | undefined;
  if (useStripe && selectedTier && hostUserId) {
    const payout = serverDb.payoutAccounts.get(hostUserId);
    try {
      const created = await createPriorityPaymentIntent({
        amountCents: selectedTier.priceCents,
        connectedAccountId: payout!.providerAccountId,
        submissionId,
        liveSessionId: sessionId,
        tierSnapshotId: selectedTier.tierSnapshotId,
        userId: user.id,
      });
      rememberPaymentHold({
        paymentIntentId: created.paymentIntentId,
        submissionId,
        liveSessionId: sessionId,
        queueEntryId,
        tierSnapshotId: selectedTier.tierSnapshotId,
        amountCents: selectedTier.priceCents,
        connectedAccountId: payout!.providerAccountId,
        kind: "submission",
      });
      clientSecret = created.clientSecret;
    } catch {
      const rolledBack = (serverDb.queues.get(sessionId) || []).filter(
        (entry) => entry.id !== queueEntryId,
      );
      serverDb.queues.set(sessionId, rolledBack);
      serverDb.submissions.delete(submissionId);
      return NextResponse.json(
        { message: "Payment could not be started", code: "PAYMENT_UNAVAILABLE" },
        { status: 503 },
      );
    }
  } else if (isPriority && allowMockPayments()) {
    clientSecret = `pi_mock_secret_${submissionId}`;
  } else if (isPriority) {
    return NextResponse.json(
      { message: "Payments are not configured", code: "PAYMENT_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const response: CreateSubmissionResponse = {
    submission: {
      id: submissionId,
      submittingUserId: user.id,
      sourceTrackId: track.id,
      artistIdentityId: resolvedArtistIdentityId,
      liveSessionId: sessionId,
      isPriority: useStripe ? false : isPriority,
      priorityTierSnapshotId: body.tierSnapshotId || null,
      currentQueueStatus: useStripe ? QueueStatus.AWAITING_PAYMENT : QueueStatus.QUEUED,
      submittedAt: newSubmission.submittedAt,
    },
    queueEntry: {
      id: queueEntryId,
      liveSessionId: sessionId,
      submissionId,
      status: useStripe ? QueueStatus.AWAITING_PAYMENT : QueueStatus.QUEUED,
      priorityRank,
      sortOrder: newQueueEntry.sortOrder,
    },
    clientSecret,
  };

  return NextResponse.json(response);
}

