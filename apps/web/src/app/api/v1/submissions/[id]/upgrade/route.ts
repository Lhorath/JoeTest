import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import {
  UpgradeSubmissionDto,
  UpgradeSubmissionResponse,
  QueueStatus,
  LiveSessionStatus,
} from "@platform/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieHeader = req.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

  const submission = serverDb.submissions.get(params.id);
  if (!submission) {
    return NextResponse.json(
      { message: "Submission not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  // Authorization check
  if (user && submission.submittingUserId !== user.id) {
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
    clientSecret: `pi_mock_upgrade_secret_${submission.id}`,
  };

  return NextResponse.json(response);
}
