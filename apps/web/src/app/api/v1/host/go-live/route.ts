import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  StoredSession,
  getStationPriorityTiers,
} from "@/lib/server-state";
import { Role, LiveSessionStatus, StreamingPlatform } from "@platform/types";
import { goLiveSchema } from "@platform/validation";

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

    // Find host profile and station
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

    const body = await request.json();
    const validation = goLiveSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid live broadcast parameters",
          errors: validation.error.flatten().fieldErrors,
          code: "VALIDATION_FAILED",
        },
        { status: 400 },
      );
    }

    const { liveTitle, primaryStreamingPlatform, streamUrl, submissionsOpen, freeLineOpen, paidSubmissionsOpen } =
      validation.data;

    // End any existing live session for this station
    for (const sess of serverDb.sessions.values()) {
      if (sess.stationId === station.id && sess.status === LiveSessionStatus.LIVE) {
        sess.status = LiveSessionStatus.ENDED;
      }
    }

    // Snapshot persistent Station Priority Tiers for this LiveSession
    const stationTiers = getStationPriorityTiers(station.id, false);
    const snapshotTiers =
      stationTiers.length > 0
        ? stationTiers.map((tier) => ({
            tierSnapshotId: `snap-${Date.now()}-${tier.id}`,
            name: tier.name,
            priceCents: tier.priceCents,
            priorityRank: tier.priorityRank,
            colorSlot: tier.colorSlot,
            available: tier.isActive,
          }))
        : [
            {
              tierSnapshotId: `tier-${Date.now()}-1`,
              name: "Priority Jump",
              priceCents: 500,
              priorityRank: 1,
              colorSlot: "TIER_COLOR_1",
              available: true,
            },
            {
              tierSnapshotId: `tier-${Date.now()}-2`,
              name: "VIP Instant Review",
              priceCents: 1500,
              priorityRank: 2,
              colorSlot: "TIER_COLOR_2",
              available: true,
            },
          ];

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSession: StoredSession = {
      id: sessionId,
      stationId: station.id,
      stationName: station.stationName,
      stationSlug: station.slug,
      hostName: station.hostName || hostProfile.publicHostName,
      hostBio: hostProfile.biography || null,
      liveTitle,
      status: LiveSessionStatus.LIVE,
      startedAt: new Date().toISOString(),
      primaryStreamingPlatform: primaryStreamingPlatform as StreamingPlatform,
      streamUrl: streamUrl || station.streamUrl || null,
      queueRevision: 1,
      submissionsOpen: submissionsOpen ?? true,
      freeLineOpen: freeLineOpen ?? true,
      paidSubmissionsOpen: paidSubmissionsOpen ?? true,
      currentQueueEntryId: null,
      currentTrack: null,
      tiers: snapshotTiers,
    };

    serverDb.sessions.set(newSession.id, newSession);
    serverDb.queues.set(newSession.id, []);

    // Update station
    station.isLive = true;
    station.currentLiveSessionId = newSession.id;
    station.primaryStreamingPlatform = primaryStreamingPlatform as StreamingPlatform;
    if (streamUrl) station.streamUrl = streamUrl;
    station.updatedAt = new Date().toISOString();

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "HOST_SESSION_STARTED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to start live session", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
