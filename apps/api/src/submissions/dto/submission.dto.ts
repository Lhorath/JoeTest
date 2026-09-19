export enum SubmissionEligibilityReason {
  AVAILABLE = "AVAILABLE",
  SUBMISSIONS_DISABLED = "SUBMISSIONS_DISABLED",
  FREE_LINE_DISABLED = "FREE_LINE_DISABLED",
  TIER_DISABLED = "TIER_DISABLED",
  ACTIVE_FREE_LIMIT_REACHED = "ACTIVE_FREE_LIMIT_REACHED",
  TOTAL_FREE_LIMIT_REACHED = "TOTAL_FREE_LIMIT_REACHED",
  TOTAL_FREE_CAPACITY_REACHED = "TOTAL_FREE_CAPACITY_REACHED",
  USER_TIER_LIMIT_REACHED = "USER_TIER_LIMIT_REACHED",
  TOTAL_TIER_CAPACITY_REACHED = "TOTAL_TIER_CAPACITY_REACHED",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  INVALID_TIER = "INVALID_TIER",
}

export interface TierEligibilityInfo {
  tierSnapshotId?: string; // null/undefined means Free line
  isFree: boolean;
  available: boolean;
  reason: SubmissionEligibilityReason;
  // Safe UI metadata
  name: string;
  priceCents: number;
  priorityRank: number;
  colorSlot?: string;
}

export interface SubmissionEligibilityResponse {
  liveSessionId: string;
  free: TierEligibilityInfo;
  priorityTiers: TierEligibilityInfo[];
}

export interface HostManualTierChangeDto {
  destinationType: "FREE" | "PRIORITY_TIER";
  tierSnapshotId?: string;
}
