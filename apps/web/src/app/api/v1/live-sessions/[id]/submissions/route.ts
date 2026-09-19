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
  const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

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
    submittingUserId: user ? user.id : "current-user",
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

  // Insert prioritized entry: higher priority rank goes before lower priority ranks
  if (isPriority) {
    let insertIndex = queue.findIndex(
      (e) => e.status === QueueStatus.QUEUED && e.priorityRank < priorityRank,
    );
    if (insertIndex === -1) {
      // Find end of active queued items
      insertIndex = queue.length;
    }
    queue.splice(insertIndex, 0, newQueueEntry);
    // Recalculate sort orders
    queue.forEach((item, idx) => {
      item.sortOrder = idx + 1;
    });
  } else {
    queue.push(newQueueEntry);
  }
  serverDb.queues.set(sessionId, queue);

  const newSubmission: StoredSubmission = {
    id: submissionId,
    submittingUserId: user ? user.id : "current-user",
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
    isPriority,
    tierName: selectedTier ? selectedTier.name : null,
    tierColorSlot: selectedTier ? selectedTier.colorSlot : null,
    currentQueueStatus: QueueStatus.QUEUED,
    submittedAt: new Date().toISOString(),
    queueEntry: {
      id: queueEntryId,
      status: QueueStatus.QUEUED,
      priorityRank,
      sortOrder: newQueueEntry.sortOrder,
    },
  };

  serverDb.submissions.set(submissionId, newSubmission);

  const response: CreateSubmissionResponse = {
    submission: {
      id: submissionId,
      submittingUserId: user ? user.id : "current-user",
      sourceTrackId: track.id,
      artistIdentityId: resolvedArtistIdentityId,
      liveSessionId: sessionId,
      isPriority,
      priorityTierSnapshotId: body.tierSnapshotId || null,
      currentQueueStatus: QueueStatus.QUEUED,
      submittedAt: newSubmission.submittedAt,
    },
    queueEntry: {
      id: queueEntryId,
      liveSessionId: sessionId,
      submissionId,
      status: QueueStatus.QUEUED,
      priorityRank,
      sortOrder: newQueueEntry.sortOrder,
    },
    clientSecret: isPriority ? `pi_mock_secret_${submissionId}` : undefined,
  };

  return NextResponse.json(response);
}

