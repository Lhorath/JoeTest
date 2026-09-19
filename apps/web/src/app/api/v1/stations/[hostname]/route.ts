import { NextRequest, NextResponse } from "next/server";
import { getPublicStationDetail } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hostname: string }> },
) {
  try {
    const { hostname } = await params;
    if (!hostname) {
      return NextResponse.json(
        { message: "Hostname parameter is required", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const station = getPublicStationDetail(hostname);
    if (!station) {
      return NextResponse.json(
        { message: "Station not found or unavailable", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(station);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch station", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
