import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  isSessionAuthorizedHost,
  playNextTrack,
} from "@/lib/server-state";

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

  if (!isSessionAuthorizedHost(user.id, sessionId)) {
    return NextResponse.json(
      { message: "Host privileges required for this live session", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  let expectedQueueRevision: number | undefined;
  try {
    const body = await req.json();
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
    const result = playNextTrack(sessionId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Failed to advance queue", code: "QUEUE_ERROR" },
      { status: 500 },
    );
  }
}
