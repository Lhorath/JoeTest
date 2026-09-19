import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  getStationWeeklyTop3,
} from "@/lib/server-state";
import { Role } from "@platform/types";

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

    if (
      !user.roles.includes(Role.HOST) &&
      !user.roles.includes(Role.OWNER_ADMIN)
    ) {
      return NextResponse.json(
        { message: "Host broadcaster privileges required", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    // Find host profile strictly scoped to authenticated user
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

    // Find host's own station
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

    // Optional query param for test verification: ?date=YYYY-MM-DDTHH:mm:ssZ
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const referenceDate = dateParam ? new Date(dateParam) : new Date();

    const top3 = getStationWeeklyTop3(station.id, referenceDate);
    return NextResponse.json(top3);
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || "Failed to fetch Weekly Top 3 ranking",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
