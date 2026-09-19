import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser, sanitizeUser } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: sanitizeUser(user) });
}
