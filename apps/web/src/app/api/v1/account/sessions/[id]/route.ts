import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieHeader = request.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const sessionId = params.id;
  for (const [token, session] of serverDb.sessionTokens.entries()) {
    if (session.id === sessionId && session.userId === user.id) {
      serverDb.sessionTokens.delete(token);
      break;
    }
  }

  return NextResponse.json({ success: true, message: "Session revoked" });
}
