import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/server-state";
import { ProcessingState } from "@platform/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const track = serverDb.tracks.get(params.id);
  if (!track) {
    return NextResponse.json(
      { message: "Track not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  track.processingState = ProcessingState.READY;
  track.updatedAt = new Date().toISOString();

  return NextResponse.json({ success: true });
}
