import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  approveHostApplicationInternal,
} from "@/lib/server-state";
import {
  StripeConnectStatusResponse,
  HostApplicationStatus,
  PayoutProvider,
} from "@platform/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const user = getAuthenticatedUser(cookieHeader);

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const payout = serverDb.payoutAccounts.get(user.id);
    const connected = Boolean(payout?.providerAccountId);
    const accountId = payout?.providerAccountId || null;
    const detailsSubmitted = Boolean(payout?.detailsSubmitted);
    const chargesEnabled = Boolean(payout?.chargesEnabled);
    const payoutsEnabled = Boolean(payout?.payoutsEnabled);
    const isComplete = connected && detailsSubmitted && chargesEnabled && payoutsEnabled;

    const response: StripeConnectStatusResponse = {
      connected,
      accountId,
      detailsSubmitted,
      chargesEnabled,
      payoutsEnabled,
      isComplete,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to check Stripe status", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

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

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const isProduction = process.env.NODE_ENV === "production";

    let payout = serverDb.payoutAccounts.get(user.id);

    // Real Stripe Synchronization Path
    if (
      stripeSecretKey &&
      !stripeSecretKey.includes("mock") &&
      !stripeSecretKey.includes("placeholder") &&
      payout?.providerAccountId &&
      payout.providerAccountId.startsWith("acct_1")
    ) {
      try {
        // Fetch authoritative account status directly from Stripe API
        const stripeRes = await fetch(
          `https://api.stripe.com/v1/accounts/${encodeURIComponent(payout.providerAccountId)}`,
          {
            headers: {
              Authorization: `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );

        if (!stripeRes.ok) {
          const errData = await stripeRes.json().catch(() => ({}));
          return NextResponse.json(
            {
              message: errData?.error?.message || "Failed to retrieve account from Stripe",
              code: "STRIPE_API_ERROR",
            },
            { status: 502 },
          );
        }

        const stripeAccount = await stripeRes.json();
        const detailsSubmitted = Boolean(stripeAccount.details_submitted);
        const chargesEnabled = Boolean(stripeAccount.charges_enabled);
        const payoutsEnabled = Boolean(stripeAccount.payouts_enabled);

        payout.detailsSubmitted = detailsSubmitted;
        payout.chargesEnabled = chargesEnabled;
        payout.payoutsEnabled = payoutsEnabled;
        payout.onboardingState = detailsSubmitted && chargesEnabled && payoutsEnabled ? "COMPLETED" : "IN_PROGRESS";
        payout.updatedAt = new Date().toISOString();

        // Synchronize with host application
        for (const app of serverDb.hostApplications.values()) {
          if (app.applicantUserId === user.id) {
            app.stripeConnected = true;
            app.stripeAccountId = payout.providerAccountId;
            app.stripeChargesEnabled = chargesEnabled;
            app.stripePayoutsEnabled = payoutsEnabled;
            app.stripeDetailsSubmitted = detailsSubmitted;
            app.isEligibleForApproval = detailsSubmitted && chargesEnabled && payoutsEnabled;
            app.payoutOnboardingStatus = payout.onboardingState;
            app.updatedAt = new Date().toISOString();

            if (app.isEligibleForApproval && !serverDb.platformSettings.requireManualHostApproval) {
              approveHostApplicationInternal(app.id, "system-auto-approval");
            }
            break;
          }
        }

        const response: StripeConnectStatusResponse = {
          connected: true,
          accountId: payout.providerAccountId,
          detailsSubmitted,
          chargesEnabled,
          payoutsEnabled,
          isComplete: detailsSubmitted && chargesEnabled && payoutsEnabled,
        };

        return NextResponse.json(response);
      } catch (stripeErr: any) {
        return NextResponse.json(
          { message: stripeErr?.message || "Stripe sync failed", code: "STRIPE_SYNC_ERROR" },
          { status: 500 },
        );
      }
    }

    // Production Guard: If in production and no Stripe Secret Key configured or mock is attempted by non-admin
    if (isProduction) {
      return NextResponse.json(
        {
          message:
            "Manual mock verification is forbidden in production. Stripe Connect webhook or live Stripe API credentials required.",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    // Development/Sandbox Testing Path (NODE_ENV !== "production")
    if (!payout) {
      payout = {
        id: `payout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        hostId: "",
        userId: user.id,
        provider: PayoutProvider.STRIPE,
        providerAccountId: `acct_test_${user.id.replace(/[^a-zA-Z0-9]/g, "")}`,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        isIdentityVerified: true,
        onboardingState: "COMPLETED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serverDb.payoutAccounts.set(user.id, payout);
    } else {
      payout.chargesEnabled = true;
      payout.payoutsEnabled = true;
      payout.detailsSubmitted = true;
      payout.isIdentityVerified = true;
      payout.onboardingState = "COMPLETED";
      payout.updatedAt = new Date().toISOString();
    }

    // Update application if exists in development mode
    for (const app of serverDb.hostApplications.values()) {
      if (app.applicantUserId === user.id) {
        app.stripeConnected = true;
        app.stripeAccountId = payout.providerAccountId;
        app.stripeChargesEnabled = true;
        app.stripePayoutsEnabled = true;
        app.stripeDetailsSubmitted = true;
        app.isEligibleForApproval = true;
        app.payoutOnboardingStatus = "COMPLETED";
        app.updatedAt = new Date().toISOString();

        // If manual approval is OFF in dev, trigger automatic approval
        if (!serverDb.platformSettings.requireManualHostApproval) {
          approveHostApplicationInternal(app.id, "system-auto-approval");
        }
        break;
      }
    }

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "STRIPE_CONNECT_DEV_MOCK_VERIFIED",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Web Browser",
      createdAt: new Date().toISOString(),
    });

    const response: StripeConnectStatusResponse = {
      connected: true,
      accountId: payout.providerAccountId,
      detailsSubmitted: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      isComplete: true,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update Stripe status", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
