import { NextRequest, NextResponse } from "next/server";
import { serverDb, StoredTrack, getAuthenticatedUser } from "@/lib/server-state";
import {
  CreateTrackUploadUrlDto,
  CreateUploadUrlResponse,
  ProcessingState,
} from "@platform/types";
import { isDevFixturesEnabled } from "@/lib/runtime-mode";
import { assertSafeAudioUpload, createAudioUploadUrl, storageConfigured } from "@/lib/object-storage";

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

  if (!body.fileSize || body.fileSize > 80 * 1024 * 1024) {
    return NextResponse.json(
      { message: "Audio files must be 80 MB or smaller", code: "FILE_TOO_LARGE" },
      { status: 400 },
    );
  }

  try {
    assertSafeAudioUpload(body.originalFilename || "", body.mimeType || "");
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unsupported upload",
        code: "UNSUPPORTED_MEDIA",
      },
      { status: 400 },
    );
  }

  const useObjectStorage = storageConfigured() && !isDevFixturesEnabled();
  if (process.env.NODE_ENV === "production" && !storageConfigured()) {
    return NextResponse.json(
      { message: "Object storage is not configured", code: "STORAGE_UNAVAILABLE" },
      { status: 503 },
    );
  }

  let uploadUrl = "";
  let objectKey: string | undefined;
  let expiresAt = new Date(Date.now() + 3600000).toISOString();
  if (useObjectStorage) {
    try {
      const presigned = await createAudioUploadUrl(body.originalFilename, body.mimeType);
      uploadUrl = presigned.uploadUrl;
      objectKey = presigned.objectKey;
      expiresAt = presigned.expiresAt;
    } catch {
      return NextResponse.json(
        { message: "Upload URL could not be created", code: "STORAGE_UNAVAILABLE" },
        { status: 503 },
      );
    }
  }

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
    durationSeconds: 0,
    processingState: ProcessingState.PROCESSING,
    artistIdentity: {
      id: artistIdentityId || `custom-${Date.now()}`,
      artistName: body.artistName.trim(),
    },
    originalFilename: body.originalFilename,
    mimeType: body.mimeType,
    objectKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  serverDb.tracks.set(trackId, newTrack);

  const response: CreateUploadUrlResponse = {
    trackId,
    uploadIntentId,
    uploadUrl: uploadUrl || `/api/v1/mock-upload/${uploadIntentId}`,
    expiresAt,
  };

  return NextResponse.json(response);
}

