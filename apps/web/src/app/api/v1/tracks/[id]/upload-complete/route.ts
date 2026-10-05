import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { ProcessingState } from "@platform/types";
import { audioObjectExists, storageConfigured } from "@/lib/object-storage";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = getAuthenticatedUser(req.headers.get("cookie"));
  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const track = serverDb.tracks.get(params.id);
  if (!track || track.userId !== user.id) {
    return NextResponse.json(
      { message: "Track not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (storageConfigured() && track.objectKey) {
    const exists = await audioObjectExists(track.objectKey);
    if (!exists) {
      return NextResponse.json(
        { message: "Uploaded audio was not found", code: "UPLOAD_INCOMPLETE" },
        { status: 409 },
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Uploaded audio was not found", code: "UPLOAD_INCOMPLETE" },
      { status: 409 },
    );
  }

  track.processingState = ProcessingState.READY;
  track.updatedAt = new Date().toISOString();

  return NextResponse.json({ success: true });
}
