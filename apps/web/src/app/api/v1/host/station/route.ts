import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { Role, LiveSessionStatus, StreamingPlatform } from "@platform/types";
import { updateStationSchema } from "@platform/validation";

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

    if (!user.roles.includes(Role.HOST) && !user.roles.includes(Role.OWNER_ADMIN)) {
      return NextResponse.json(
        { message: "Host broadcaster privileges required", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    // Find host profile
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

    // Find station
    let station = null;
    for (const st of serverDb.stations.values()) {
      if (st.hostId === hostProfile.id) {
        station = st;
        break;
      }
    }

    if (!station) {
      return NextResponse.json(
        { message: "Station not found for host", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check live state
    let isLive = false;
    let sessionId: string | null = null;
    for (const sess of serverDb.sessions.values()) {
      if (sess.stationId === station.id && sess.status === LiveSessionStatus.LIVE) {
        isLive = true;
        sessionId = sess.id;
        break;
      }
    }

    return NextResponse.json({
      ...station,
      isLive,
      currentLiveSessionId: sessionId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch station", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const validation = updateStationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid station configuration data",
          errors: validation.error.flatten().fieldErrors,
          code: "VALIDATION_FAILED",
        },
        { status: 400 },
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

    if (!station) {
      return NextResponse.json(
        { message: "Station not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const {
      description,
      primaryStreamingPlatform,
      streamUrl,
      acceptedContentRules,
      explicitContentAllowed,
      maxTrackDurationSeconds,
      maxQueueSize,
    } = validation.data;

    if (description !== undefined) station.description = description ? description.trim() : null;
    if (primaryStreamingPlatform !== undefined) station.primaryStreamingPlatform = primaryStreamingPlatform as StreamingPlatform;
    if (streamUrl !== undefined) station.streamUrl = streamUrl ? streamUrl.trim() : null;
    if (acceptedContentRules !== undefined) station.acceptedContentRules = acceptedContentRules ? acceptedContentRules.trim() : null;
    if (explicitContentAllowed !== undefined) station.explicitContentAllowed = explicitContentAllowed;
    if (maxTrackDurationSeconds !== undefined) station.maxTrackDurationSeconds = maxTrackDurationSeconds;
    if (maxQueueSize !== undefined) station.maxQueueSize = maxQueueSize;

    station.updatedAt = new Date().toISOString();

    // Check if live
    let isLive = false;
    let sessionId: string | null = null;
    for (const sess of serverDb.sessions.values()) {
      if (sess.stationId === station.id && sess.status === LiveSessionStatus.LIVE) {
        isLive = true;
        sessionId = sess.id;
        break;
      }
    }

    return NextResponse.json({
      ...station,
      isLive,
      currentLiveSessionId: sessionId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update station", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
