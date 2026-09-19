import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { Role } from "@platform/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader);

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  if (!user.roles.includes(Role.OWNER_ADMIN)) {
    return NextResponse.json(
      { message: "Administrator access required", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  return NextResponse.json(serverDb.themeCustomization);
}

export async function PUT(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader);

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    if (!user.roles.includes(Role.OWNER_ADMIN)) {
      return NextResponse.json(
        { message: "Administrator access required", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const current = serverDb.themeCustomization;

    // Update site name and assets
    if (body.siteName !== undefined) current.siteName = body.siteName.trim();
    if (body.primaryLogoUrl !== undefined) current.primaryLogoUrl = body.primaryLogoUrl ? body.primaryLogoUrl.trim() : null;
    if (body.alternateLogoUrl !== undefined) current.alternateLogoUrl = body.alternateLogoUrl ? body.alternateLogoUrl.trim() : null;
    if (body.faviconUrl !== undefined) current.faviconUrl = body.faviconUrl ? body.faviconUrl.trim() : null;
    if (body.customCss !== undefined) current.customCss = body.customCss ? body.customCss.trim() : null;

    // Update color tokens
    const tokens = current.tokens;
    if (body.primaryColor) tokens.primaryColor = body.primaryColor;
    if (body.primaryHoverColor) tokens.primaryHoverColor = body.primaryHoverColor;
    if (body.secondaryColor) tokens.secondaryColor = body.secondaryColor;
    if (body.accentColor) tokens.accentColor = body.accentColor;
    if (body.backgroundColor) tokens.backgroundColor = body.backgroundColor;
    if (body.surfaceColor) tokens.surfaceColor = body.surfaceColor;
    if (body.textColor) tokens.textColor = body.textColor;
    if (body.mutedTextColor) tokens.mutedTextColor = body.mutedTextColor;
    if (body.borderColor) tokens.borderColor = body.borderColor;
    if (body.liveColor) tokens.liveColor = body.liveColor;
    if (body.successColor) tokens.successColor = body.successColor;
    if (body.warningColor) tokens.warningColor = body.warningColor;
    if (body.dangerColor) tokens.dangerColor = body.dangerColor;

    current.updatedByUserId = user.id;
    current.updatedAt = new Date().toISOString();

    serverDb.themeCustomization = current;

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "THEME_CUSTOMIZATION_UPDATED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(current);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update customization", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}
