import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { PayoutProvider, StripeConnectLinkResponse } from "@platform/types";
import { allowMockPayments, createConnectOnboardingLink } from "@/lib/stripe-server";

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

    if (allowMockPayments()) {
      const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || request.nextUrl.origin;
      const response: StripeConnectLinkResponse = {
        accountLinkUrl: `${baseUrl}/host/onboarding?stripe_connect=refresh`,
        accountId: payout.providerAccountId,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
      return NextResponse.json(response);
    }

    const origin = process.env.NEXT_PUBLIC_WEB_URL || request.nextUrl.origin;
    try {
      const link = await createConnectOnboardingLink({
        email: user.email,
        userId: user.id,
        existingAccountId: payout.providerAccountId,
        returnUrl: `${origin}/host/onboarding?stripe_connect=return`,
        refreshUrl: `${origin}/host/onboarding?stripe_connect=refresh`,
      });
      payout.providerAccountId = link.accountId;
      payout.chargesEnabled = false;
      payout.payoutsEnabled = false;
      payout.detailsSubmitted = false;
      payout.onboardingState = "IN_PROGRESS";
      payout.updatedAt = new Date().toISOString();
      serverDb.payoutAccounts.set(user.id, payout);

      const response: StripeConnectLinkResponse = {
        accountLinkUrl: link.url,
        accountId: link.accountId,
        expiresAt: link.expiresAt,
      };
      return NextResponse.json(response);
    } catch {
      return NextResponse.json(
        { message: "Stripe Connect is not available", code: "STRIPE_UNAVAILABLE" },
        { status: 503 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to create Stripe Connect link", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
