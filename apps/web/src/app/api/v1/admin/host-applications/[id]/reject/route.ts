import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { Role, HostApplicationStatus } from "@platform/types";

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
    const app = serverDb.hostApplications.get(id);

    if (!app) {
      return NextResponse.json(
        { message: "Host application not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    app.status = HostApplicationStatus.REJECTED;
    app.reviewedByUserId = user.id;
    app.reviewedAt = new Date().toISOString();
    app.userFacingRejectionReason = body.reason || "Application did not meet broadcast requirements at this time.";
    app.updatedAt = new Date().toISOString();

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "HOST_APPLICATION_REJECTED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Host application rejected.",
      application: app,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to reject application", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
