import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  approveHostApplicationInternal,
} from "@/lib/server-state";
import { Role } from "@platform/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader);

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    if (!user.roles.includes(Role.OWNER_ADMIN)) {
      return NextResponse.json(
        { message: "Administrator access required", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const result = approveHostApplicationInternal(id, user.id);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error || "Failed to approve application", code: "APPROVAL_FAILED" },
        { status: 400 },
      );
    }

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "HOST_APPLICATION_APPROVED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Host application approved and station activated successfully.",
      station: result.station,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to approve application", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
