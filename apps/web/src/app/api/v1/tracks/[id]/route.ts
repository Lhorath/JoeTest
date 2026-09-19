import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { updateTrackSchema } from "@platform/validation";

export const dynamic = "force-dynamic";

export async function GET(
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

  return NextResponse.json(track);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieHeader = req.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader);

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const track = serverDb.tracks.get(params.id);
  if (!track) {
    return NextResponse.json(
      { message: "Track not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (track.userId !== user.id && !user.roles.includes("OWNER_ADMIN" as any)) {
    return NextResponse.json(
      { message: "Permission denied", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  try {
    const rawBody = await req.json();
    const result = updateTrackSchema.safeParse(rawBody);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors,
          code: "VALIDATION_FAILED",
        },
        { status: 400 },
      );
    }

    const data = result.data;
    if (data.songName !== undefined) {
      track.songName = data.songName.trim();
    }
    if (data.albumName !== undefined) {
      track.albumName = data.albumName ? data.albumName.trim() : null;
    }
    if (data.explicitContent !== undefined) {
      track.explicitContent = data.explicitContent;
    }
    if (data.bpm !== undefined) {
      track.bpm = data.bpm;
    }
    if (data.musicalKey !== undefined) {
      track.musicalKey = data.musicalKey ? data.musicalKey.trim() : null;
    }
    if (data.isPublic !== undefined) {
      track.isPublic = data.isPublic;
    }
    track.updatedAt = new Date().toISOString();

    serverDb.tracks.set(track.id, track);
    return NextResponse.json(track);
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Failed to update track", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieHeader = req.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader);

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const track = serverDb.tracks.get(params.id);
  if (!track) {
    return NextResponse.json(
      { message: "Track not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (track.userId !== user.id && !user.roles.includes("OWNER_ADMIN" as any)) {
    return NextResponse.json(
      { message: "Permission denied", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  serverDb.tracks.delete(params.id);
  return NextResponse.json({ success: true });
}
