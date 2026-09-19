import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  updateStationPriorityTier,
  deleteStationPriorityTier,
} from "@/lib/server-state";
import { Role } from "@platform/types";
import { updateStationPriorityTierSchema } from "@platform/validation";

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

  for (const st of serverDb.stations.values()) {
    return { hostProfile: null, station: st };
  }

  return { hostProfile: null, station: null };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tierId: string } },
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
    const validationResult = updateStationPriorityTierSchema.safeParse(rawBody);

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

    const updated = updateStationPriorityTier(
      params.tierId,
      station.id,
      validationResult.data,
    );

    if (!updated) {
      return NextResponse.json(
        { message: "Priority tier not found on your station", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update priority tier", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tierId: string } },
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

    const success = deleteStationPriorityTier(params.tierId, station.id);

    if (!success) {
      return NextResponse.json(
        { message: "Priority tier not found on your station", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Priority tier deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to delete priority tier", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
