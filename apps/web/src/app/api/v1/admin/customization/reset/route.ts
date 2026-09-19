import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser, DEFAULT_THEME_TOKENS } from "@/lib/server-state";
import { Role } from "@platform/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

  const resetTheme = {
    id: "site-customization-default",
    siteName: "TheQueue",
    primaryLogoUrl: null,
    alternateLogoUrl: null,
    faviconUrl: null,
    tokens: { ...DEFAULT_THEME_TOKENS },
    customCss: null,
    updatedByUserId: user.id,
    updatedAt: new Date().toISOString(),
  };

  serverDb.themeCustomization = resetTheme;

  serverDb.securityLogs.unshift({
    id: `sec-${Date.now()}`,
    userId: user.id,
    eventType: "THEME_CUSTOMIZATION_RESET",
    ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    userAgent: request.headers.get("user-agent") || "Web Browser",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json(resetTheme);
}
