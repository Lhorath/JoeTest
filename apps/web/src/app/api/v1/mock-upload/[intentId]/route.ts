import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { intentId: string } },
) {
  const intent = serverDb.uploadIntents.get(params.intentId);
  if (!intent) {
    return NextResponse.json(
      { message: "Upload intent not found or expired" },
      { status: 404 },
    );
  }

  // We can read or stream the audio buffer if needed
  try {
    const arrayBuffer = await req.arrayBuffer();
    const track = serverDb.tracks.get(intent.trackId);
    if (track) {
      // Store as base64 data URL for playback
      const mime = intent.metadata.mimeType || "audio/mpeg";
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      track.audioDataUrl = `data:${mime};base64,${base64}`;
    }
  } catch (err) {
    console.warn("Failed to buffer upload, using default fallback audio", err);
  }

  return new NextResponse(null, { status: 200 });
}
