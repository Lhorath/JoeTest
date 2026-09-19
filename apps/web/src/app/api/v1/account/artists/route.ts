import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  getArtistIdentitiesForUser,
  createArtistIdentity,
} from "@/lib/server-state";
import { createArtistIdentitySchema } from "@platform/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const identities = getArtistIdentitiesForUser(user.id);
  return NextResponse.json(identities);
}

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const rawBody = await request.json();
    const parseResult = createArtistIdentitySchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json(
        { message: errorMessage || "Invalid artist identity data", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const newIdentity = createArtistIdentity(user.id, parseResult.data);

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "PROFILE_UPDATED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(newIdentity, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to create artist identity", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
