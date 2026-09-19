import { NextRequest, NextResponse } from "next/server";
import { serverDb, StoredTrack, getAuthenticatedUser } from "@/lib/server-state";
import {
  CreateTrackUploadUrlDto,
  CreateUploadUrlResponse,
  ProcessingState,
} from "@platform/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader);

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required to upload tracks", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body: CreateTrackUploadUrlDto = await req.json();

  const trackId = `track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const uploadIntentId = `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Store intent
  serverDb.uploadIntents.set(uploadIntentId, {
    trackId,
    intentId: uploadIntentId,
    metadata: body,
    expiresAt: new Date(Date.now() + 3600000),
  });

  // Find artist identity if exists for this user matching artistName
  let artistIdentityId: string | null = null;
  for (const identity of serverDb.artistIdentities.values()) {
    if (identity.userId === user.id && !identity.deletedAt) {
      if (identity.artistName.toLowerCase() === body.artistName.trim().toLowerCase()) {
        artistIdentityId = identity.id;
        break;
      }
    }
  }

  // Pre-create track in UPLOADING/PROCESSING state
  const newTrack: StoredTrack = {
    id: trackId,
    userId: user.id,
    artistIdentityId,
    songName: body.songName.trim(),
    albumName: body.albumName ? body.albumName.trim() : null,
    explicitContent: Boolean(body.explicitContent),
    bpm: body.bpm || null,
    musicalKey: body.musicalKey ? body.musicalKey.trim() : null,
    durationSeconds: Math.floor(Math.random() * 90) + 150, // simulated duration 2:30 - 4:00
    processingState: ProcessingState.PROCESSING,
    artistIdentity: {
      id: artistIdentityId || `custom-${Date.now()}`,
      artistName: body.artistName.trim(),
    },
    originalFilename: body.originalFilename,
    mimeType: body.mimeType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  serverDb.tracks.set(trackId, newTrack);

  const response: CreateUploadUrlResponse = {
    trackId,
    uploadIntentId,
    uploadUrl: `/api/v1/mock-upload/${uploadIntentId}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };

  return NextResponse.json(response);
}

