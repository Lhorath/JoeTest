import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, createEmailVerificationToken } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader);

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const token = createEmailVerificationToken(user.id);

    // In non-production logging or preview environments:
    if (process.env.NODE_ENV !== "production") {
      console.log(`[AUTH] Email verification token generated for ${user.email}: ${token}`);
    }

    return NextResponse.json({
      success: true,
      message: "Verification email generated.",
      token: process.env.NODE_ENV !== "production" ? token : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to send verification email", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
