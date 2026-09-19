import { NextRequest, NextResponse } from "next/server";
import {
  serverDb,
  getAuthenticatedUser,
  approveHostApplicationInternal,
  StoredHostApplication,
  recordLegalAcceptance,
} from "@/lib/server-state";
import { createHostApplicationSchema } from "@platform/validation";
import { HostApplicationStatus, StreamingPlatform } from "@platform/types";
import { TERMS_METADATA } from "@platform/config";

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

    // Check if an application already exists
    for (const existing of serverDb.hostApplications.values()) {
      if (existing.applicantUserId === user.id) {
        return NextResponse.json(
          {
            message: "You have already submitted a broadcaster/host application",
            code: "APPLICATION_EXISTS",
            application: existing,
          },
          { status: 409 },
        );
      }
    }

    const body = await request.json();
    if (body.acceptHostTerms === undefined) {
      body.acceptHostTerms = true;
    }
    if (!body.termsVersion) {
      body.termsVersion = TERMS_METADATA.version;
    }
    const validation = createHostApplicationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid host application data",
          errors: validation.error.flatten().fieldErrors,
          code: "VALIDATION_FAILED",
        },
        { status: 400 },
      );
    }

    const {
      publicHostName,
      primaryStreamingPlatform,
      primaryStreamingProfileUrl,
      country,
      biography,
      acceptedGenres,
      exampleLivestreamLinks,
      acceptHostTerms,
      termsVersion,
    } = validation.data;

    if (acceptHostTerms !== true) {
      return NextResponse.json(
        {
          message: "You must accept the Host Terms and Broadcast Responsibility rules to apply as a host",
          code: "HOST_TERMS_NOT_ACCEPTED",
        },
        { status: 400 },
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : request.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Web Browser";

    // Track Versioned Host Terms Acceptance
    recordLegalAcceptance({
      userId: user.id,
      documentSlug: "terms",
      version: termsVersion || TERMS_METADATA.version,
      acceptanceSource: "HOST_APPLICATION",
      ipAddress: ip,
      userAgent,
    });

    // Check payout account state
    const payout = serverDb.payoutAccounts.get(user.id);
    const stripeConnected = Boolean(payout?.providerAccountId);
    const stripeChargesEnabled = Boolean(payout?.chargesEnabled);
    const stripePayoutsEnabled = Boolean(payout?.payoutsEnabled);
    const stripeDetailsSubmitted = Boolean(payout?.detailsSubmitted);
    const isStripeComplete =
      stripeConnected &&
      stripeChargesEnabled &&
      stripePayoutsEnabled &&
      stripeDetailsSubmitted;

    const applicationId = `host-app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newApplication: StoredHostApplication = {
      id: applicationId,
      applicantUserId: user.id,
      applicantUser: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
      publicHostName,
      normalizedHostName: publicHostName.toLowerCase().trim(),
      primaryStreamingPlatform: primaryStreamingPlatform as StreamingPlatform,
      primaryStreamingProfileUrl,
      country,
      biography: biography || null,
      acceptedGenres: acceptedGenres || null,
      exampleLivestreamLinks: exampleLivestreamLinks || null,
      payoutOnboardingStatus: isStripeComplete ? "COMPLETED" : "PENDING",
      status: HostApplicationStatus.SUBMITTED,
      reviewedByUserId: null,
      rejectionReasonCode: null,
      internalRejectionNotes: null,
      userFacingRejectionReason: null,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stripeConnected,
      stripeAccountId: payout?.providerAccountId || null,
      stripeChargesEnabled,
      stripePayoutsEnabled,
      stripeDetailsSubmitted,
      isEligibleForApproval: isStripeComplete,
      stationSlug: null,
    };

    serverDb.hostApplications.set(newApplication.id, newApplication);

    // If auto-approval is enabled and Stripe is complete, auto-approve immediately!
    if (!serverDb.platformSettings.requireManualHostApproval && isStripeComplete) {
      approveHostApplicationInternal(newApplication.id, "system-auto-approval");
    }

    serverDb.securityLogs.unshift({
      id: `sec-${Date.now()}`,
      userId: user.id,
      eventType: "HOST_APPLICATION_SUBMITTED",
      ipAddress: ip,
      userAgent,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(serverDb.hostApplications.get(applicationId), {
      status: 201,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to submit application", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

