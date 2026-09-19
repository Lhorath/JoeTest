import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { UserSubmissionSummary } from "@platform/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader);

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const submissions: UserSubmissionSummary[] = Array.from(
    serverDb.submissions.values(),
  )
    .filter((sub) => sub.submittingUserId === user.id)
    .map((sub) => {
      // Keep live queue position updated from the corresponding session queue
      const sessionQueue = serverDb.queues.get(sub.liveSessionId) || [];
      const queueEntry = sessionQueue.find((e) => e.submissionId === sub.id);

      return {
        id: sub.id,
        liveSessionId: sub.liveSessionId,
        sessionTitle: sub.sessionTitle,
        sessionStatus: sub.sessionStatus,
        stationName: sub.stationName,
        songName: sub.songName,
        artistName: sub.artistName,
        durationSeconds: sub.durationSeconds,
        spotifyUrl: sub.spotifyUrl || null,
        artistIdentityId: sub.artistIdentityId || null,
        isPriority: sub.isPriority,
        tierName: sub.tierName,
        tierColorSlot: sub.tierColorSlot,
        currentQueueStatus: queueEntry ? queueEntry.status : sub.currentQueueStatus,
        submittedAt: sub.submittedAt,
        queueEntry: queueEntry
          ? {
              id: queueEntry.id,
              status: queueEntry.status,
              priorityRank: queueEntry.priorityRank,
              sortOrder: queueEntry.sortOrder,
            }
          : sub.queueEntry,
      };
    });

  return NextResponse.json(submissions);
}

