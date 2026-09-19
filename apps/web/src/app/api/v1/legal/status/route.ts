import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  getUserLegalAcceptancesAsync,
  hasUserAcceptedCurrentTermsAsync,
} from "@/lib/server-state";
import { TERMS_METADATA, PRIVACY_METADATA, getLegalConfig } from "@platform/config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader);

    const legalConfig = getLegalConfig();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        currentVersion: TERMS_METADATA.version,
        termsMetadata: TERMS_METADATA,
        privacyMetadata: PRIVACY_METADATA,
        legalConfig,
        isAccepted: false,
        lastAcceptedVersion: null,
        lastAcceptedAt: null,
        history: [],
      });
    }

    const history = await getUserLegalAcceptancesAsync(user.id);
    const isAccepted = await hasUserAcceptedCurrentTermsAsync(user.id);
    const lastRecord = history.length > 0 ? history[history.length - 1] : null;

    return NextResponse.json({
      authenticated: true,
      currentVersion: TERMS_METADATA.version,
      termsMetadata: TERMS_METADATA,
      privacyMetadata: PRIVACY_METADATA,
      legalConfig,
      isAccepted,
      lastAcceptedVersion: lastRecord?.version || null,
      lastAcceptedAt: lastRecord?.acceptedAt || null,
      history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch legal status", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
