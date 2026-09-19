import { NextRequest, NextResponse } from "next/server";
import { getOverlayDataForStation } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { hostname: string } },
) {
  const hostname = params.hostname;
  if (!hostname) {
    return NextResponse.json(
      { message: "Hostname is required", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const data = getOverlayDataForStation(hostname);
  if (!data) {
    return NextResponse.json(
      { message: "Station not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
