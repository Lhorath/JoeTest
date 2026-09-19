import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:session_token|platform_session|__Host-platform_session)=([^;]+)/);
    if (match) {
      serverDb.sessionTokens.delete(match[1]);
    }
  }

  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.headers.set(
    "Set-Cookie",
    `session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${isProd ? "; Secure" : ""}`,
  );
  return response;
}
