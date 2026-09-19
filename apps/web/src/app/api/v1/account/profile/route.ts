import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser, sanitizeUser } from "@/lib/server-state";
import { updateUserProfileSchema } from "@platform/validation";

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

  return NextResponse.json(sanitizeUser(user));
}

export async function PATCH(request: NextRequest) {
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
    const validationResult = updateUserProfileSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: validationResult.error.flatten().fieldErrors,
          code: "VALIDATION_FAILED",
        },
        { status: 400 },
      );
    }

    const body = validationResult.data;

    if (body.displayName !== undefined) {
      user.displayName = body.displayName.trim();
    }
    if (body.bio !== undefined) {
      user.bio = body.bio ? body.bio.trim() : null;
    }
    if (body.avatarUrl !== undefined) {
      user.avatarUrl = body.avatarUrl ? body.avatarUrl.trim() : null;
    }
    if (body.country !== undefined) {
      user.country = body.country ? body.country.trim() : null;
    }
    if (body.websiteUrl !== undefined) {
      user.websiteUrl = body.websiteUrl ? body.websiteUrl.trim() : null;
    }
    if (body.spotifyProfileUrl !== undefined) {
      user.spotifyProfileUrl = body.spotifyProfileUrl
        ? body.spotifyProfileUrl.trim()
        : null;
    }

    user.updatedAt = new Date().toISOString();
    serverDb.users.set(user.id, user);

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "PROFILE_UPDATED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(sanitizeUser(user));
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update profile", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
