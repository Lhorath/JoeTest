import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const resetToken = createPasswordResetToken(email);

    // In dev / preview logging without sending real SMTP:
    if (resetToken && process.env.NODE_ENV !== "production") {
      console.log(`[AUTH] Password reset token generated for ${email}: ${resetToken}`);
    }

    // Return neutral success message to prevent user enumeration
    return NextResponse.json({
      success: true,
      message: "If an account matches that email, a password reset link has been dispatched.",
      resetToken: process.env.NODE_ENV !== "production" ? resetToken : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Password reset request failed", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
