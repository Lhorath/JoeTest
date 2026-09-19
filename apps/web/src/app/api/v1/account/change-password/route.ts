import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { message: "New password must be at least 8 characters", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (currentPassword && user.passwordHash && user.passwordHash !== currentPassword) {
      return NextResponse.json(
        { message: "Current password is incorrect", code: "INVALID_CREDENTIALS" },
        { status: 400 },
      );
    }

    user.passwordHash = newPassword;
    user.updatedAt = new Date().toISOString();
    serverDb.users.set(user.id, user);

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "PASSWORD_CHANGED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to change password", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
