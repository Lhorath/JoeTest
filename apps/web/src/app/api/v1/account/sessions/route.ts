import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { UserSessionInfo } from "@platform/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const currentToken = cookieHeader?.match(/session_token=([^;]+)/)?.[1];

  const userSessions: UserSessionInfo[] = [];
  for (const session of serverDb.sessionTokens.values()) {
    if (session.userId === user.id) {
      userSessions.push({
        id: session.id,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        isCurrent: session.token === currentToken,
      });
    }
  }

  // Ensure at least one current session entry
  if (userSessions.length === 0) {
    userSessions.push({
      id: "sess-current",
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: "Current Browser",
      isCurrent: true,
    });
  }

  return NextResponse.json(userSessions);
}
