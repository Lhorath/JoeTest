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
  const session = serverDb.sessions.get(params.id);
  if (!session) {
    return NextResponse.json(
      { message: "Live session not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json(session);
}

export async function PATCH(
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

  if (!isSessionAuthorizedHost(user.id, params.id)) {
    return NextResponse.json(
      { message: "Host privileges required for this live session", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const session = serverDb.sessions.get(params.id);
  if (!session) {
    return NextResponse.json(
      { message: "Live session not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const body = await req.json();

  if (body.submissionsOpen !== undefined) session.submissionsOpen = Boolean(body.submissionsOpen);
  if (body.freeLineOpen !== undefined) session.freeLineOpen = Boolean(body.freeLineOpen);
  if (body.paidSubmissionsOpen !== undefined) session.paidSubmissionsOpen = Boolean(body.paidSubmissionsOpen);
  if (body.liveTitle !== undefined) session.liveTitle = String(body.liveTitle).trim();
  if (body.streamUrl !== undefined) session.streamUrl = body.streamUrl ? String(body.streamUrl).trim() : null;

  return NextResponse.json({ success: true, session });
}
