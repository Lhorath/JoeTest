import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/server-state";
import {
  SubmissionEligibilityResponse,
  SubmissionEligibilityReason,
} from "@platform/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = serverDb.sessions.get(params.id);
  if (!session) {
    return NextResponse.json(
      { message: "Live session not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const response: SubmissionEligibilityResponse = {
    liveSessionId: session.id,
    free: {
      isFree: true,
      available: session.submissionsOpen && session.freeLineOpen,
      reason: session.submissionsOpen && session.freeLineOpen
        ? SubmissionEligibilityReason.AVAILABLE
        : SubmissionEligibilityReason.FREE_LINE_DISABLED,
      name: "Free Line",
      priceCents: 0,
      priorityRank: 0,
      colorSlot: "FREE_LINE",
    },
    priorityTiers: (session.tiers || []).map((tier) => ({
      tierSnapshotId: tier.tierSnapshotId,
      isFree: false,
      available: session.submissionsOpen && session.paidSubmissionsOpen && tier.available,
      reason: session.submissionsOpen && session.paidSubmissionsOpen && tier.available
        ? SubmissionEligibilityReason.AVAILABLE
        : SubmissionEligibilityReason.TIER_DISABLED,
      name: tier.name,
      priceCents: tier.priceCents,
      priorityRank: tier.priorityRank,
      colorSlot: tier.colorSlot,
    })),
  };

  return NextResponse.json(response);
}
