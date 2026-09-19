import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/server-state";

export const dynamic = "force-dynamic";

const FALLBACK_AUDIO =
  "https://actions.google.com/sounds/v1/science_fiction/alien_beacon.ogg";

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

  const downloadUrl = track.audioDataUrl || FALLBACK_AUDIO;

  return NextResponse.json({
    downloadUrl,
    mimeType: track.mimeType || "audio/ogg",
  });
}
