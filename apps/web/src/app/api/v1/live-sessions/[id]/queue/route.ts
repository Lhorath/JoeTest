import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  isSessionAuthorizedHost,
} from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function GET(
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

  const queue = serverDb.queues.get(sessionId) || [];
  return NextResponse.json(queue);
}
