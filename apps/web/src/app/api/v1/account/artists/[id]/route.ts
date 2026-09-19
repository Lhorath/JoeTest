import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  getArtistIdentityById,
  updateArtistIdentity,
  deleteArtistIdentity,
} from "@/lib/server-state";
import { updateArtistIdentitySchema } from "@platform/validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieHeader = request.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const identity = getArtistIdentityById(params.id);
  if (!identity) {
    return NextResponse.json(
      { message: "Artist identity not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  // Authorization check: User must own the Artist Identity
  if (identity.userId !== user.id) {
    return NextResponse.json(
      { message: "Forbidden: You do not have permission to view this artist identity", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  return NextResponse.json(identity);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const existingIdentity = getArtistIdentityById(params.id);
    if (!existingIdentity) {
      return NextResponse.json(
        { message: "Artist identity not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Authorization check
    if (existingIdentity.userId !== user.id) {
      return NextResponse.json(
        { message: "Forbidden: You do not have permission to update this artist identity", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const rawBody = await request.json();
    const parseResult = updateArtistIdentitySchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json(
        { message: errorMessage || "Invalid artist identity data", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const updated = updateArtistIdentity(params.id, user.id, parseResult.data);

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "PROFILE_UPDATED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update artist identity", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const existingIdentity = getArtistIdentityById(params.id);
    if (!existingIdentity) {
      return NextResponse.json(
        { message: "Artist identity not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Authorization check
    if (existingIdentity.userId !== user.id) {
      return NextResponse.json(
        { message: "Forbidden: You do not have permission to delete this artist identity", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const result = deleteArtistIdentity(params.id, user.id);

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "PROFILE_UPDATED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to delete artist identity", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
