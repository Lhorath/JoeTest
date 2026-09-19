import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  isSessionAuthorizedHost,
} from "@/lib/server-state";
import { QueueStatus } from "@platform/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; entryId: string } },
) {
  const sessionId = params.id;
  const entryId = params.entryId;

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

  if (!isSessionAuthorizedHost(user.id, sessionId)) {
    return NextResponse.json(
      { message: "Host privileges required for this live session", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const { destinationType, tierSnapshotId } = body;

  const queue = serverDb.queues.get(sessionId) || [];
  const entryIndex = queue.findIndex((e) => e.id === entryId);
  if (entryIndex === -1) {
    return NextResponse.json(
      { message: "Queue entry not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const entry = queue[entryIndex];

  if (destinationType === "FREE") {
    entry.isPriority = false;
    entry.priorityRank = 0;
    entry.tierName = null;
    entry.colorSlot = "FREE_LINE";
  } else if (destinationType === "PRIORITY_TIER" && tierSnapshotId) {
    const tier = session.tiers?.find((t) => t.tierSnapshotId === tierSnapshotId);
    if (!tier) {
      return NextResponse.json(
        { message: "Priority tier not found in session", code: "TIER_NOT_FOUND" },
        { status: 400 },
      );
    }
    entry.isPriority = true;
    entry.priorityRank = tier.priorityRank;
    entry.tierName = tier.name;
    entry.colorSlot = tier.colorSlot;
  }

  // Re-sort queue by priority rank (for active queued items)
  if (entry.status === QueueStatus.QUEUED) {
    queue.splice(entryIndex, 1);
    let insertIndex = queue.findIndex(
      (e) => e.status === QueueStatus.QUEUED && e.priorityRank < entry.priorityRank,
    );
    if (insertIndex === -1) {
      insertIndex = queue.length;
    }
    queue.splice(insertIndex, 0, entry);
    queue.forEach((item, idx) => {
      item.sortOrder = idx + 1;
    });
  }

  session.queueRevision = (session.queueRevision || 0) + 1;
  serverDb.queues.set(sessionId, queue);

  return NextResponse.json({ success: true, message: "Queue tier updated" });
}
