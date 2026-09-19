import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  getStationPriorityTiers,
  createStationPriorityTier,
} from "@/lib/server-state";
import { Role } from "@platform/types";
import { createStationPriorityTierSchema } from "@platform/validation";

export const dynamic = "force-dynamic";

function getHostStation(userId: string) {
  let hostProfile = null;
  for (const hp of serverDb.hostProfiles.values()) {
    if (hp.userId === userId) {
      hostProfile = hp;
      break;
    }
  }

  if (hostProfile) {
    for (const st of serverDb.stations.values()) {
      if (st.hostId === hostProfile.id) {
        return { hostProfile, station: st };
      }
    }
  }

  // Fallback lookup: find any station associated with host profile or first station for owner admin
  for (const st of serverDb.stations.values()) {
    return { hostProfile: null, station: st };
  }

  return { hostProfile: null, station: null };
}

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

    const { station } = getHostStation(user.id);
    if (!station) {
      return NextResponse.json(
        { message: "Station not found for host", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const tiers = getStationPriorityTiers(station.id, true);
    return NextResponse.json(tiers);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to retrieve priority tiers", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

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

    const { station } = getHostStation(user.id);
    if (!station) {
      return NextResponse.json(
        { message: "Station not found for host", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const rawBody = await request.json();
    const validationResult = createStationPriorityTierSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: validationResult.error.flatten().fieldErrors,
          code: "VALIDATION_FAILED",
        },
        { status: 400 },
      );
    }

    const newTier = createStationPriorityTier(station.id, validationResult.data);
    return NextResponse.json(newTier, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to create priority tier", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
