import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  // Delete all sessions for user
  for (const [token, session] of serverDb.sessionTokens.entries()) {
    if (session.userId === user.id) {
      serverDb.sessionTokens.delete(token);
    }
  }

  const response = NextResponse.json({ success: true, message: "Logged out from all sessions" });
  response.headers.set(
    "Set-Cookie",
    "session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  );
  return response;
}
