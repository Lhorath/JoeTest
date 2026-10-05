import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, createEmailVerificationToken } from "@/lib/server-state";
import { isDevFixturesEnabled } from "@/lib/runtime-mode";
import { sendVerificationEmail } from "@/lib/transactional-mail";

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
    await sendVerificationEmail(user.email, token);

    return NextResponse.json({
      success: true,
      message: "Verification email generated.",
      token: isDevFixturesEnabled() ? token : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to send verification email", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
