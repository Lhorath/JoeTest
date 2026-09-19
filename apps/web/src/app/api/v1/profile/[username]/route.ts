import { NextRequest, NextResponse } from "next/server";
import { getPublicUserProfile } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } },
) {
  const username = params.username;
  if (!username) {
    return NextResponse.json(
      { message: "Username is required", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const profile = getPublicUserProfile(username);
  if (!profile) {
    return NextResponse.json(
      { message: "User profile not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json(profile);
}
