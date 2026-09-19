import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { Role, StationStatus, LiveSessionStatus } from "@platform/types";

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
    // id could be application id, user id, or station id
    let targetUserId: string | null = null;
    const app = serverDb.hostApplications.get(id);
    if (app) {
      targetUserId = app.applicantUserId;
    } else {
      const u = serverDb.users.get(id);
      if (u) targetUserId = u.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { message: "Target host not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Suspend station
    let hostProfile = null;
    for (const hp of serverDb.hostProfiles.values()) {
      if (hp.userId === targetUserId) {
        hostProfile = hp;
        hp.isApproved = false;
        hp.updatedAt = new Date().toISOString();
        break;
      }
    }

    if (hostProfile) {
      for (const st of serverDb.stations.values()) {
        if (st.hostId === hostProfile.id) {
          st.status = StationStatus.INACTIVE;
          st.isApproved = false;
          st.isPublicVisible = false;
          st.isLive = false;
          st.currentLiveSessionId = null;
          st.updatedAt = new Date().toISOString();

          // End active sessions
          for (const sess of serverDb.sessions.values()) {
            if (sess.stationId === st.id && sess.status === LiveSessionStatus.LIVE) {
              sess.status = LiveSessionStatus.ENDED;
            }
          }
        }
      }
    }

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "HOST_SUSPENDED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Host and associated station have been suspended.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to suspend host", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
