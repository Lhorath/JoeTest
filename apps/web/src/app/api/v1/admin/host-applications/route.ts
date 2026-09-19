import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { Role, HostApplicationStatus } from "@platform/types";

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

    if (!user.roles.includes(Role.OWNER_ADMIN)) {
      return NextResponse.json(
        { message: "Administrator access required", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const applications = Array.from(serverDb.hostApplications.values()).map((app) => {
      const payout = serverDb.payoutAccounts.get(app.applicantUserId);
      const stripeConnected = Boolean(payout?.providerAccountId);
      const stripeChargesEnabled = Boolean(payout?.chargesEnabled);
      const stripePayoutsEnabled = Boolean(payout?.payoutsEnabled);
      const stripeDetailsSubmitted = Boolean(payout?.detailsSubmitted);
      const isEligibleForApproval =
        stripeConnected &&
        stripeChargesEnabled &&
        stripePayoutsEnabled &&
        stripeDetailsSubmitted;

      return {
        ...app,
        stripeConnected,
        stripeAccountId: payout?.providerAccountId || null,
        stripeChargesEnabled,
        stripePayoutsEnabled,
        stripeDetailsSubmitted,
        isEligibleForApproval,
      };
    });

    const filtered = statusFilter
      ? applications.filter((app) => app.status === statusFilter)
      : applications;

    // Sort newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch host applications", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
