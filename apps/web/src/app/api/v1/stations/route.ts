import { NextRequest, NextResponse } from "next/server";
import { getPublicStationsList } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const stations = getPublicStationsList();
    return NextResponse.json(stations);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch stations", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
