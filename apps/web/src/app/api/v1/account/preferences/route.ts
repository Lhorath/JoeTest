import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { UserPreferencesDto } from "@platform/types";

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

  const prefs = serverDb.userPreferences.get(user.id) || {
    emailNotifications: true,
    marketingEmails: false,
    soundEffects: true,
    themeMode: "dark" as const,
  };

  return NextResponse.json(prefs);
}

export async function PUT(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader) || serverDb.users.get("user-demo");

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const currentPrefs = serverDb.userPreferences.get(user.id) || {
      emailNotifications: true,
      marketingEmails: false,
      soundEffects: true,
      themeMode: "dark" as const,
    };

    const updated: UserPreferencesDto = {
      emailNotifications:
        body.emailNotifications !== undefined
          ? Boolean(body.emailNotifications)
          : currentPrefs.emailNotifications,
      marketingEmails:
        body.marketingEmails !== undefined
          ? Boolean(body.marketingEmails)
          : currentPrefs.marketingEmails,
      soundEffects:
        body.soundEffects !== undefined
          ? Boolean(body.soundEffects)
          : currentPrefs.soundEffects,
      themeMode: body.themeMode === "system" ? "system" : "dark",
    };

    serverDb.userPreferences.set(user.id, updated);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update preferences", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
