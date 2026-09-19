import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  syncAutomaticApprovalsIfApplicable,
} from "@/lib/server-state";
import { Role } from "@platform/types";
import { updatePlatformSettingsSchema } from "@platform/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    return NextResponse.json(serverDb.platformSettings);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch platform settings", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const validation = updatePlatformSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid platform settings data",
          errors: validation.error.flatten().fieldErrors,
          code: "VALIDATION_FAILED",
        },
        { status: 400 },
      );
    }

    const { requireManualHostApproval } = validation.data;
    serverDb.platformSettings.requireManualHostApproval = requireManualHostApproval;
    serverDb.platformSettings.updatedAt = new Date().toISOString();
    serverDb.platformSettings.updatedByUserId = user.id;

    // If auto-approval was toggled on, process any eligible pending applications
    if (!requireManualHostApproval) {
      syncAutomaticApprovalsIfApplicable(user.id);
    }

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "PLATFORM_SETTINGS_UPDATED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(serverDb.platformSettings);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update platform settings", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}
