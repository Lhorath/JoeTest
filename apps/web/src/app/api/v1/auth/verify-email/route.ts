import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyAndConsumeEmailVerificationToken } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { message: "Verification token is required", code: "INVALID_TOKEN" },
        { status: 400 },
      );
    }

    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader);

    const result = verifyAndConsumeEmailVerificationToken(token, user?.id);
    if (!result.success) {
      return NextResponse.json(
        { message: result.message || "Invalid or expired verification token.", code: "INVALID_TOKEN" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Verification failed", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json(
        { message: "Verification token is required", code: "INVALID_TOKEN" },
        { status: 400 },
      );
    }

    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader);

    const result = verifyAndConsumeEmailVerificationToken(token, user?.id);
    if (!result.success) {
      return NextResponse.json(
        { message: result.message || "Invalid or expired verification token.", code: "INVALID_TOKEN" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Verification failed", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
