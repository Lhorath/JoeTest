import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { HostOnboardingStatus, HostApplicationStatus, Role } from "@platform/types";

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

    // Find application by user
    let application = null;
    for (const app of serverDb.hostApplications.values()) {
      if (app.applicantUserId === user.id) {
        application = app;
        break;
      }
    }

    // Find payout account
    const payout = serverDb.payoutAccounts.get(user.id);
    const stripeConnected = Boolean(payout?.providerAccountId);
    const stripeAccountId = payout?.providerAccountId || null;
    const stripeChargesEnabled = Boolean(payout?.chargesEnabled);
    const stripePayoutsEnabled = Boolean(payout?.payoutsEnabled);
    const stripeDetailsSubmitted = Boolean(payout?.detailsSubmitted);
    const isEligibleForApproval =
      stripeConnected &&
      stripeChargesEnabled &&
      stripePayoutsEnabled &&
      stripeDetailsSubmitted;

    // Check if user is approved host
    const isApproved =
      user.roles.includes(Role.HOST) ||
      (application && application.status === HostApplicationStatus.APPROVED);

    // Find station if host
    let station = null;
    let hostProfile = null;
    for (const hp of serverDb.hostProfiles.values()) {
      if (hp.userId === user.id) {
        hostProfile = hp;
        break;
      }
    }

    if (hostProfile) {
      for (const st of serverDb.stations.values()) {
        if (st.hostId === hostProfile.id) {
          station = st;
          break;
        }
      }
    }

    const response: HostOnboardingStatus = {
      hasApplication: Boolean(application),
      application,
      stripeConnected,
      stripeAccountId,
      stripeChargesEnabled,
      stripePayoutsEnabled,
      stripeDetailsSubmitted,
      isEligibleForApproval,
      isApproved: Boolean(isApproved),
      status: application ? application.status : isApproved ? HostApplicationStatus.APPROVED : "NOT_STARTED",
      station,
      requireManualHostApproval: serverDb.platformSettings.requireManualHostApproval,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch onboarding status", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
