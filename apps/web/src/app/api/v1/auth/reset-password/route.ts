import { NextRequest, NextResponse } from "next/server";
import { verifyAndConsumePasswordResetToken } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token;
    const newPassword = body.password;
    const confirmPassword = body.confirmPassword;

    if (!token || !newPassword) {
      return NextResponse.json(
        { message: "Token and password are required", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { message: "Passwords do not match.", code: "PASSWORD_MISMATCH" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const result = verifyAndConsumePasswordResetToken(token, newPassword);
    if (!result.success) {
      return NextResponse.json(
        { message: result.message || "Invalid or expired reset token.", code: "INVALID_TOKEN" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password has been successfully updated. You may now log in.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Password reset failed", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
