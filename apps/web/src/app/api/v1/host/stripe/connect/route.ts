import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { PayoutProvider, StripeConnectLinkResponse } from "@platform/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader);

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    let payout = serverDb.payoutAccounts.get(user.id);
    if (!payout) {
      payout = {
        id: `payout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        hostId: "",
        userId: user.id,
        provider: PayoutProvider.STRIPE,
        providerAccountId: `acct_live_${user.id.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now().toString(36)}`,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        isIdentityVerified: false,
        onboardingState: "STARTED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serverDb.payoutAccounts.set(user.id, payout);
    }

    // In a test/mock environment or live environment, we provide an onboarding URL
    const baseUrl = request.nextUrl.origin;
    const accountLinkUrl = `${baseUrl}/host/onboarding?stripe_connect=success&account_id=${payout.providerAccountId}`;

    const response: StripeConnectLinkResponse = {
      accountLinkUrl,
      accountId: payout.providerAccountId,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to create Stripe Connect link", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
