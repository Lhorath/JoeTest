import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { TrackSummary } from "@platform/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader);

  // If no user is logged in, return empty list or fallback demo tracks
  const userId = user ? user.id : null;

  const tracks: TrackSummary[] = Array.from(serverDb.tracks.values())
    .filter((t) => {
      if (!userId) return false;
      return t.userId === userId;
    })
    .map((t) => ({
      id: t.id,
      userId: t.userId,
      artistIdentityId: t.artistIdentityId,
      songName: t.songName,
      albumName: t.albumName,
      explicitContent: t.explicitContent,
      bpm: t.bpm,
      musicalKey: t.musicalKey,
      durationSeconds: t.durationSeconds,
      processingState: t.processingState,
      isPublic: t.isPublic ?? false,
      artistIdentity: t.artistIdentity,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

  return NextResponse.json(tracks);
}

