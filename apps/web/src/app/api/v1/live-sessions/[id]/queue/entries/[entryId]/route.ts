import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  isSessionAuthorizedHost,
  removeOrSkipQueueEntry,
  completeQueueEntry,
} from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function DELETE(
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

  let expectedQueueRevision: number | undefined;
  const searchParam = req.nextUrl.searchParams.get("expectedQueueRevision");
  if (searchParam) {
    expectedQueueRevision = parseInt(searchParam, 10);
  } else {
    try {
      const body = await req.json();
      expectedQueueRevision = body?.expectedQueueRevision;
    } catch {}
  }

  if (
    typeof expectedQueueRevision === "number" &&
    !isNaN(expectedQueueRevision) &&
    expectedQueueRevision !== session.queueRevision
  ) {
    return NextResponse.json(
      {
        message: "Stale queue revision",
        code: "CONFLICT",
        currentQueueRevision: session.queueRevision,
      },
      { status: 409 },
    );
  }

  try {
    const result = removeOrSkipQueueEntry(sessionId, entryId, "REMOVED");
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Failed to remove queue entry", code: "QUEUE_ERROR" },
      { status: 500 },
    );
  }
}

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

  let action: string = "SKIP";
  let expectedQueueRevision: number | undefined;
  try {
    const body = await req.json();
    if (body?.action) action = body.action;
    expectedQueueRevision = body?.expectedQueueRevision;
  } catch {}

  if (
    typeof expectedQueueRevision === "number" &&
    expectedQueueRevision !== session.queueRevision
  ) {
    return NextResponse.json(
      {
        message: "Stale queue revision",
        code: "CONFLICT",
        currentQueueRevision: session.queueRevision,
      },
      { status: 409 },
    );
  }

  try {
    if (action === "COMPLETE") {
      const result = completeQueueEntry(sessionId, entryId);
      return NextResponse.json(result);
    } else {
      const result = removeOrSkipQueueEntry(sessionId, entryId, "SKIPPED");
      return NextResponse.json(result);
    }
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Failed to update queue entry", code: "QUEUE_ERROR" },
      { status: 500 },
    );
  }
}
