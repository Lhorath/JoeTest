import { NextRequest, NextResponse } from "next/server";
import { serverDb, createSessionForUser, sanitizeUser, StoredUser } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = (body.email || body.emailOrUsername || "").toLowerCase().trim();
    const password = body.password || body.passwordPlain || "";

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Email/username and password are required", code: "INVALID_CREDENTIALS" },
        { status: 400 },
      );
    }

    // Find user by email or username
    let foundUser: StoredUser | null = null;
    for (const user of serverDb.users.values()) {
      if (
        user.email.toLowerCase() === identifier ||
        user.username.toLowerCase() === identifier
      ) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return NextResponse.json(
        { message: "Invalid email/username or password", code: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    // Check password
    if (foundUser.passwordHash !== password) {
      return NextResponse.json(
        { message: "Invalid email/username or password", code: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    if (foundUser.accountStatus === "BANNED" || foundUser.accountStatus === "SUSPENDED") {
      return NextResponse.json(
        { message: `Account is ${foundUser.accountStatus.toLowerCase()}`, code: "ACCOUNT_LOCKED" },
        { status: 403 },
      );
    }

    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Web Browser";

    const { cookie } = createSessionForUser(foundUser.id, ip, userAgent);

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: foundUser.id,
      eventType: "LOGIN_SUCCESS",
      ipAddress: ip,
      userAgent,
      createdAt: new Date().toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      user: sanitizeUser(foundUser),
    });

    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
