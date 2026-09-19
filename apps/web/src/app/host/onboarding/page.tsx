"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import {
  HostOnboardingStatus,
  StreamingPlatform,
  HostApplicationStatus,
  Role,
} from "@platform/types";
import { Button, Card, Badge, Input } from "@platform/ui";
import {
  Sparkles,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Shield,
  Loader2,
  Tv,
  Globe,
  Music,
  Check,
  RefreshCw,
} from "lucide-react";
import { TERMS_METADATA } from "@platform/config";

export default function HostOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading, refreshAuth } = useAuth();

  const [statusData, setStatusData] = React.useState<HostOnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = React.useState(false);
  const [isVerifyingStripe, setIsVerifyingStripe] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Application Form State
  const [publicHostName, setPublicHostName] = React.useState("");
  const [primaryPlatform, setPrimaryPlatform] = React.useState<StreamingPlatform>(
    StreamingPlatform.TWITCH,
  );
  const [profileUrl, setProfileUrl] = React.useState("");
  const [country, setCountry] = React.useState("United States");
  const [biography, setBiography] = React.useState("");
  const [acceptedGenres, setAcceptedGenres] = React.useState("");
  const [exampleLinks, setExampleLinks] = React.useState("");
  const [acceptHostTerms, setAcceptHostTerms] = React.useState(false);

  const loadStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.host.getOnboardingStatus();
      setStatusData(data);

      if (data.application) {
        setPublicHostName(data.application.publicHostName || "");
        setPrimaryPlatform(data.application.primaryStreamingPlatform || StreamingPlatform.TWITCH);
        setProfileUrl(data.application.primaryStreamingProfileUrl || "");
        setCountry(data.application.country || "United States");
        setBiography(data.application.biography || "");
        setAcceptedGenres(data.application.acceptedGenres || "");
        setExampleLinks(data.application.exampleLivestreamLinks || "");
      } else if (user?.displayName) {
        setPublicHostName(user.displayName);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load broadcaster onboarding status");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/host/onboarding");
      return;
    }

    if (isAuthenticated) {
      loadStatus();
    }
  }, [isAuthenticated, authLoading]);

  // Handle Stripe callback URL params
  React.useEffect(() => {
    if (searchParams.get("stripe_connect") === "success") {
      handleVerifyStripe();
    }
  }, [searchParams]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicHostName.trim()) {
      setError("Broadcaster name is required");
      return;
    }
    if (!profileUrl.trim()) {
      setError("Channel / Profile URL is required");
      return;
    }
    if (!acceptHostTerms) {
      setError(
        "You must agree to the Terms of Service and Broadcaster Responsibilities before applying.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const app = await api.host.apply({
        publicHostName: publicHostName.trim(),
        primaryStreamingPlatform: primaryPlatform,
        primaryStreamingProfileUrl: profileUrl.trim(),
        country: country.trim(),
        biography: biography.trim() || undefined,
        acceptedGenres: acceptedGenres.trim() || undefined,
        exampleLivestreamLinks: exampleLinks.trim() || undefined,
        acceptHostTerms: true,
        termsVersion: TERMS_METADATA.version,
      });

      setSuccessMessage("Broadcaster application submitted successfully!");
      await loadStatus();
      await refreshAuth();
    } catch (err: any) {
      setError(err?.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectStripe = async () => {
    setIsConnectingStripe(true);
    setError(null);
    try {
      const res = await api.host.createStripeConnectLink();
      if (res.accountLinkUrl) {
        window.location.href = res.accountLinkUrl;
      }
    } catch (err: any) {
      setError(err?.message || "Failed to initiate Stripe Connect onboarding");
      setIsConnectingStripe(false);
    }
  };

  const handleVerifyStripe = async () => {
    setIsVerifyingStripe(true);
    setError(null);
    try {
      await api.host.verifyStripeTest();
      setSuccessMessage("Stripe Connect account connected and verified!");
      await loadStatus();
      await refreshAuth();
    } catch (err: any) {
      setError(err?.message || "Failed to verify Stripe connection");
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <p className="text-sm text-zinc-400">Loading broadcaster onboarding...</p>
      </div>
    );
  }

  const isApproved = statusData?.isApproved || user?.roles?.includes(Role.HOST);
  const isStripeComplete = statusData?.stripeChargesEnabled && statusData?.stripePayoutsEnabled;
  const hasApp = Boolean(statusData?.hasApplication);
  const appStatus = statusData?.application?.status;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="info" className="gap-1.5 text-xs font-semibold">
            <Radio className="h-3.5 w-3.5" /> Broadcaster Program
          </Badge>
          {isApproved && (
            <Badge variant="success" className="gap-1.5 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approved Broadcaster
            </Badge>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-50 tracking-tight">
          Broadcaster & Station Onboarding
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl">
          Host live music review sessions, receive queue submissions from artists, and monetize priority fast-track tiers with Stripe Connect payouts.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-100">Action Required</p>
            <p className="text-xs text-red-300 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-200 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-100">Success</p>
            <p className="text-xs text-emerald-300 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Step Tracker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            hasApp
              ? "border-emerald-800/60 bg-emerald-950/20 text-zinc-200"
              : "border-violet-800/60 bg-violet-950/20 text-zinc-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-zinc-400">STEP 1</span>
            {hasApp ? (
              <span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </span>
            ) : (
              <span className="h-6 w-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
            )}
          </div>
          <p className="font-bold text-sm text-zinc-100 mt-2">Station Profile</p>
          <p className="text-xs text-zinc-400 mt-1">
            {hasApp ? "Application Submitted" : "Submit host details & streaming channel"}
          </p>
        </div>

        {/* Step 2 */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isStripeComplete
              ? "border-emerald-800/60 bg-emerald-950/20 text-zinc-200"
              : hasApp
                ? "border-violet-800/60 bg-violet-950/20 text-zinc-200"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-zinc-400">STEP 2</span>
            {isStripeComplete ? (
              <span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </span>
            ) : (
              <span className="h-6 w-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold">
                2
              </span>
            )}
          </div>
          <p className="font-bold text-sm text-zinc-100 mt-2">Stripe Connect</p>
          <p className="text-xs text-zinc-400 mt-1">
            {isStripeComplete ? "Payouts Enabled & Verified" : "Connect payout account for queue tier revenue"}
          </p>
        </div>

        {/* Step 3 */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isApproved
              ? "border-emerald-800/60 bg-emerald-950/20 text-zinc-200"
              : "border-zinc-800 bg-zinc-900/40 text-zinc-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-zinc-400">STEP 3</span>
            {isApproved ? (
              <span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </span>
            ) : (
              <span className="h-6 w-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold">
                3
              </span>
            )}
          </div>
          <p className="font-bold text-sm text-zinc-100 mt-2">Station Activation</p>
          <p className="text-xs text-zinc-400 mt-1">
            {isApproved
              ? "Station Live & Ready"
              : statusData?.requireManualHostApproval
                ? "Pending Administrator Review"
                : "Auto-approves once Stripe is connected"}
          </p>
        </div>
      </div>

      {/* Main Section Based on State */}
      {isApproved ? (
        <Card className="border-emerald-800/80 bg-gradient-to-b from-emerald-950/30 to-zinc-900 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-50">
                You are an Approved Broadcaster!
              </h2>
              <p className="text-xs sm:text-sm text-emerald-300">
                Your broadcaster studio and station vanity URL are ready to go live.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-zinc-400">Station Vanity URL:</span>
              <Link
                href={`/${statusData?.station?.slug || statusData?.application?.stationSlug || "station"}`}
                className="text-xs font-mono font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1"
              >
                /{statusData?.station?.slug || statusData?.application?.stationSlug || "station"}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-zinc-400">Station Name:</span>
              <span className="text-xs font-bold text-zinc-200">
                {statusData?.station?.stationName || statusData?.application?.publicHostName}
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-zinc-400">Payout Status:</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> Stripe Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-2">
            <Link href="/host/studio">
              <Button variant="primary" size="lg" className="gap-2 shadow-lg min-h-[44px]">
                <Radio className="h-4 w-4" /> Enter Broadcaster Studio
              </Button>
            </Link>
            <Link href={`/${statusData?.station?.slug || statusData?.application?.stationSlug || "station"}`}>
              <Button variant="outline" size="lg" className="gap-2 min-h-[44px]">
                <ExternalLink className="h-4 w-4" /> View Public Station Page
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Broadcaster Profile Form */}
          <Card className="border-zinc-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-50">
                  Broadcaster Application & Channel Info
                </h2>
                <p className="text-xs text-zinc-400">
                  Tell us about your streaming presence and broadcaster name.
                </p>
              </div>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Public Host / Station Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={hasApp}
                    value={publicHostName}
                    onChange={(e) => setPublicHostName(e.target.value)}
                    placeholder="e.g. DJ Pulse, Beats By Nova"
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Country of Broadcast <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={hasApp}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United States, United Kingdom, Canada"
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Primary Streaming Platform <span className="text-red-400">*</span>
                  </label>
                  <select
                    disabled={hasApp}
                    value={primaryPlatform}
                    onChange={(e) => setPrimaryPlatform(e.target.value as StreamingPlatform)}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 disabled:opacity-60 cursor-pointer"
                  >
                    <option value={StreamingPlatform.TWITCH}>Twitch</option>
                    <option value={StreamingPlatform.YOUTUBE}>YouTube</option>
                    <option value={StreamingPlatform.KICK}>Kick</option>
                    <option value={StreamingPlatform.TIKTOK}>TikTok</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Primary Channel / Profile URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    disabled={hasApp}
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder="https://twitch.tv/yourchannel"
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Host Biography & Station Description
                </label>
                <textarea
                  rows={3}
                  disabled={hasApp}
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  placeholder="Share a short bio, your music background, and what kind of music you review..."
                  className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 disabled:opacity-60 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Accepted Music Genres / Content Guidelines
                </label>
                <input
                  type="text"
                  disabled={hasApp}
                  value={acceptedGenres}
                  onChange={(e) => setAcceptedGenres(e.target.value)}
                  placeholder="e.g. Hip-Hop, R&B, EDM, Indie Rock"
                  className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 disabled:opacity-60"
                />
              </div>

              {!hasApp && (
                <div className="pt-2 space-y-4">
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <label
                      htmlFor="host-accept-terms"
                      className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-400 select-none group"
                    >
                      <input
                        type="checkbox"
                        id="host-accept-terms"
                        checked={acceptHostTerms}
                        onChange={(e) => setAcceptHostTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500 focus:ring-offset-zinc-900 transition-colors cursor-pointer"
                        required
                      />
                      <span className="leading-relaxed">
                        I agree to the{" "}
                        <Link
                          href="/terms#section-5"
                          target="_blank"
                          className="font-medium text-violet-400 hover:text-violet-300 underline"
                        >
                          Terms of Service & Broadcaster Responsibilities
                        </Link>
                        . I acknowledge that I am an independent host, responsible for complying with the policies of my streaming platform, managing my live queue fairly, and maintaining broadcaster conduct standards.
                      </span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isSubmitting || !acceptHostTerms}
                    className="gap-2 min-h-[44px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Submit Application
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </Card>

          {/* Section 2: Stripe Connect Payout Setup */}
          <Card className="border-zinc-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2">
                  Stripe Connect Payout Setup
                  {isStripeComplete && (
                    <Badge variant="success" className="text-[10px]">
                      Connected & Ready
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-zinc-400">
                  Connect your bank or debit card to receive payouts from song priority tier upgrades.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Stripe Account:</span>
                <span className="font-mono font-semibold text-zinc-300">
                  {statusData?.stripeAccountId || "Not connected"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Charges & Payouts:</span>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    isStripeComplete ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {isStripeComplete ? (
                    <>
                      <Check className="h-3 w-3" /> Enabled
                    </>
                  ) : (
                    "Verification Required"
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {!isStripeComplete ? (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleConnectStripe}
                    disabled={isConnectingStripe}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white min-h-[44px]"
                  >
                    {isConnectingStripe ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4" />
                    )}
                    Connect with Stripe
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleVerifyStripe}
                    disabled={isVerifyingStripe}
                    className="gap-2 min-h-[44px]"
                  >
                    {isVerifyingStripe ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Simulate Express Verification
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Payout connection verified. You are eligible for broadcaster approval.
                </div>
              )}
            </div>
          </Card>

          {/* Section 3: Review & Approval Status */}
          <Card className="border-zinc-800 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-50">
                  Application Status & Review
                </h2>
                <p className="text-xs text-zinc-400">
                  System approval criteria and broadcast activation status.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Application State:</span>
                <span className="font-bold text-violet-400">
                  {appStatus || "NOT_SUBMITTED"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Review Policy:</span>
                <span className="font-semibold text-zinc-300">
                  {statusData?.requireManualHostApproval
                    ? "Manual Administrator Approval Required"
                    : "Automatic Instant Approval (upon Stripe connection)"}
                </span>
              </div>

              {appStatus === HostApplicationStatus.REJECTED && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-300 mt-2">
                  <p className="font-bold text-red-200">Rejection Notice:</p>
                  <p className="mt-0.5">
                    {statusData?.application?.userFacingRejectionReason ||
                      "Application did not meet broadcast requirements at this time."}
                  </p>
                </div>
              )}
            </div>

            {hasApp && !isApproved && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock className="h-4 w-4 text-amber-400" />
                {statusData?.requireManualHostApproval
                  ? "Your application is currently under review by platform administrators. You will receive an approval confirmation shortly."
                  : !isStripeComplete
                    ? "Complete Stripe Connect setup in Step 2 to automatically activate your station."
                    : "Processing activation..."}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
