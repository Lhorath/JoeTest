import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  recordLegalAcceptanceAsync,
} from "@/lib/server-state";
import { recordLegalAcceptanceSchema } from "@platform/validation";
import { TERMS_METADATA, PRIVACY_METADATA } from "@platform/config";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader);

    if (!user) {
      return NextResponse.json(
        {
          message: "Authentication required to record terms acceptance",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validation = recordLegalAcceptanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid legal acceptance payload",
          errors: validation.error.flatten().fieldErrors,
          code: "VALIDATION_FAILED",
        },
        { status: 400 },
      );
    }

    const { version, acceptanceSource, documentSlug } = validation.data;

    // Validate that the documentSlug and version correspond to published legal documents
    const validTermsVersion = TERMS_METADATA.version;
    const validPrivacyVersion = PRIVACY_METADATA.version;

    if (documentSlug === "terms" && version !== validTermsVersion) {
      return NextResponse.json(
        {
          message: `The provided terms version (${version}) does not match the active published version (${validTermsVersion})`,
          code: "INVALID_LEGAL_VERSION",
        },
        { status: 400 },
      );
    }

    if (documentSlug === "privacy" && version !== validPrivacyVersion) {
      return NextResponse.json(
        {
          message: `The provided privacy version (${version}) does not match the active published version (${validPrivacyVersion})`,
          code: "INVALID_LEGAL_VERSION",
        },
        { status: 400 },
      );
    }

    if (documentSlug !== "terms" && documentSlug !== "privacy") {
      return NextResponse.json(
        {
          message: `Unsupported legal document: ${documentSlug}`,
          code: "UNSUPPORTED_DOCUMENT",
        },
        { status: 400 },
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : request.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Web Browser";

    const record = await recordLegalAcceptanceAsync({
      userId: user.id,
      documentSlug,
      version,
      acceptanceSource,
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      record,
      currentVersion:
        documentSlug === "privacy" ? validPrivacyVersion : validTermsVersion,
      isAccepted: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || "Failed to record legal acceptance",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
