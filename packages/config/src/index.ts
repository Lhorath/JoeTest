export const APP_PORTS = {
  web: 3000,
  host: 3001,
  admin: 3002,
  api: 4000,
  worker: 4001,
} as const;

export const COOKIE_NAMES = {
  session:
    process.env.NODE_ENV === "production"
      ? "__Host-platform_session"
      : "platform_session",
} as const;

export const SESSION_EXPIRY = {
  idle: 1000 * 60 * 30, // 30 minutes
  absolute: 1000 * 60 * 60 * 24 * 7, // 7 days
} as const;

export const getPublicAppOrigin = (): string => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const envOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PUBLIC_APPLICATION_ORIGIN ||
    process.env.APP_URL;
  if (envOrigin) {
    return envOrigin.replace(/\/$/, "");
  }
  return "";
};

export const getPublicStationUrl = (hostnameOrSlug: string): string => {
  const origin = getPublicAppOrigin();
  const cleanSlug = (hostnameOrSlug || "").replace(/^\//, "");
  return origin ? `${origin}/${cleanSlug}` : `/${cleanSlug}`;
};

export const TERMS_METADATA = {
  version: "2026-08-25.1",
  effectiveDate: "August 25, 2026",
  lastUpdated: "August 25, 2026",
} as const;

export const PRIVACY_METADATA = {
  version: "2026-08-25.1",
  effectiveDate: "August 25, 2026",
  lastUpdated: "August 25, 2026",
} as const;

export const getLegalConfig = () => ({
  entityName:
    process.env.LEGAL_ENTITY_NAME || "[OPERATOR / LEGAL ENTITY NAME]",
  legalEmail: process.env.LEGAL_CONTACT_EMAIL || "legal@thequeue.live",
  copyrightEmail:
    process.env.COPYRIGHT_CONTACT_EMAIL || "dmca@thequeue.live",
  mailingAddress:
    process.env.LEGAL_MAILING_ADDRESS || "[DESIGNATED LEGAL MAILING ADDRESS]",
  governingJurisdiction:
    process.env.GOVERNING_JURISDICTION || "[SPECIFIED GOVERNING JURISDICTION]",
});

// ============================================================================
// Weekly Top 3 & Authoritative Playback Constants & Period Calculations
// ============================================================================

export const WEEKLY_TOP3_TIMEZONE = "America/New_York" as const;
export const QUALIFICATION_CONTINUOUS_PLAYBACK_MS = 120_000; // 120 seconds
export const NORMAL_PLAY_RATE_LIMIT_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface WeeklyPeriodResult {
  timeZone: "America/New_York";
  startDate: Date;
  endDate: Date;
  startIso: string;
  endIso: string;
  periodKey: string;
  formattedRange: string;
}

/**
 * Server-authoritative Weekly Top 3 period calculation.
 * Resets every Saturday at 00:00 America/New_York.
 * Deterministic and timezone-aware across DST transitions.
 */
export function getCurrentWeeklyPeriod(
  referenceDate: Date = new Date(),
): WeeklyPeriodResult {
  const timeZone = WEEKLY_TOP3_TIMEZONE;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(referenceDate);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const dayIndexMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentDayOfWeek = dayIndexMap[map.weekday || "Sat"] ?? 0;

  // Days since last Saturday (Saturday = 6)
  // Saturday: (6 + 1) % 7 = 0
  // Sunday: (0 + 1) % 7 = 1
  // Friday: (5 + 1) % 7 = 6
  const daysSinceSaturday = (currentDayOfWeek + 1) % 7;

  const nyYear = parseInt(map.year || "1970", 10);
  const nyMonth = parseInt(map.month || "1", 10);
  const nyDay = parseInt(map.day || "1", 10);

  function nyMidnightToUtc(y: number, m: number, d: number): Date {
    const isoString = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T05:00:00Z`;
    const cand = new Date(isoString);
    const candParts = dtf.formatToParts(cand);
    const candMap: Record<string, string> = {};
    for (const p of candParts) candMap[p.type] = p.value;
    const rawHour = candMap.hour || "0";
    const candHour = parseInt(rawHour === "24" ? "0" : rawHour, 10);
    const candMinute = parseInt(candMap.minute || "0", 10);
    const candDay = parseInt(candMap.day || "1", 10);

    let diffMinutes = candHour * 60 + candMinute;
    if (candDay !== d) {
      if (candDay > d) diffMinutes += 24 * 60;
      else diffMinutes -= 24 * 60;
    }
    return new Date(cand.getTime() - diffMinutes * 60000);
  }

  const tempDate = new Date(Date.UTC(nyYear, nyMonth - 1, nyDay - daysSinceSaturday));
  const startSatY = tempDate.getUTCFullYear();
  const startSatM = tempDate.getUTCMonth() + 1;
  const startSatD = tempDate.getUTCDate();
  const startUtc = nyMidnightToUtc(startSatY, startSatM, startSatD);

  const nextSatTemp = new Date(Date.UTC(startSatY, startSatM - 1, startSatD + 7));
  const endSatY = nextSatTemp.getUTCFullYear();
  const endSatM = nextSatTemp.getUTCMonth() + 1;
  const endSatD = nextSatTemp.getUTCDate();
  const endUtc = nyMidnightToUtc(endSatY, endSatM, endSatD);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const startMonthStr = monthNames[startSatM - 1];
  const endMonthStr = monthNames[endSatM - 1];
  const formattedRange = `${startMonthStr} ${startSatD}, ${startSatY} – ${endMonthStr} ${endSatD}, ${endSatY}`;

  return {
    timeZone: "America/New_York",
    startDate: startUtc,
    endDate: endUtc,
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
    periodKey: `${startSatY}-${String(startSatM).padStart(2, "0")}-${String(startSatD).padStart(2, "0")}`,
    formattedRange,
  };
}



