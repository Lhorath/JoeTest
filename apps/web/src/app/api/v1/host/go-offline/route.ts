import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { Role, LiveSessionStatus } from "@platform/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader);

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    if (!user.roles.includes(Role.HOST) && !user.roles.includes(Role.OWNER_ADMIN)) {
      return NextResponse.json(
        { message: "Host broadcaster privileges required", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    let hostProfile = null;
    for (const hp of serverDb.hostProfiles.values()) {
      if (hp.userId === user.id) {
        hostProfile = hp;
        break;
      }
    }

    if (!hostProfile) {
      return NextResponse.json(
        { message: "Host profile not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    let station = null;
    for (const st of serverDb.stations.values()) {
      if (st.hostId === hostProfile.id) {
        station = st;
        break;
      }
    }

    if (station) {
      station.isLive = false;
      station.currentLiveSessionId = null;
      station.updatedAt = new Date().toISOString();

      for (const sess of serverDb.sessions.values()) {
        if (sess.stationId === station.id && sess.status === LiveSessionStatus.LIVE) {
          sess.status = LiveSessionStatus.ENDED;
        }
      }
    }

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "HOST_SESSION_ENDED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Broadcast ended. Station is now offline.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to end broadcast", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
