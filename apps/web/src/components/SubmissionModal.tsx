"use client";

import * as React from "react";
import {
  Dialog,
  Button,
  Badge,
  Card,
  RadioGroup,
} from "@platform/ui";
import {
  SubmissionEligibilityResponse,
  TierEligibilityInfo,
  TrackSummary,
  CreateSubmissionResponse,
  ArtistIdentitySummary,
} from "@platform/types";
import Link from "next/link";
import {
  Sparkles,
  Music,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  Loader2,
  Info,
  User,
  Plus,
  ExternalLink,
} from "lucide-react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { api } from "../lib/api";
import { TrackItem } from "./TrackItem";
import { TrackUploader } from "./TrackUploader";
import { validateSpotifyUrl } from "@platform/validation";

const SpotifyIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308c-.215.353-.676.467-1.029.252-2.824-1.725-6.379-2.115-10.567-1.158-.403.092-.808-.16-.9-.562-.093-.404.159-.808.562-.901 4.585-1.048 8.52-.607 11.682 1.34.353.216.467.676.252 1.029zm1.47-3.262c-.27.44-.848.58-1.288.31-3.232-1.986-8.159-2.56-11.982-1.398-.497.151-1.03-.131-1.181-.628-.152-.497.131-1.03.628-1.181 4.372-1.327 9.803-.687 13.513 1.609.44.27.58.848.31 1.288zm.126-3.41c-3.876-2.302-10.27-2.514-13.985-1.386-.594.18-1.226-.154-1.407-.748-.18-.593.154-1.226.748-1.407 4.273-1.298 11.332-1.05 15.794 1.598.534.317.708 1.01.391 1.544-.318.533-1.011.708-1.541.399z" />
  </svg>
);

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_TYooMQauvdEDq54NiTphI7jx",
);

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  onSubmissionSuccess: () => void;
}

// Inner Stripe Payment Form Component
const StripePaymentForm: React.FC<{
  clientSecret: string;
  priceCents: number;
  tierName: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}> = ({ clientSecret, priceCents, tierName, onSuccess, onError, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    try {
      if (clientSecret.startsWith("pi_mock_")) {
        // Preview/Development simulated payment intent
        setTimeout(() => {
          setIsProcessing(false);
          onSuccess();
        }, 600);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        },
      );

      if (error) {
        onError(error.message || "Payment failed");
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess();
      } else {
        // Processing or requires action
        onSuccess();
      }
    } catch (err: any) {
      onError(err?.message || "Payment error occurred");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Upgrading to:</span>
          <span className="font-semibold text-violet-400">{tierName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Total Due:</span>
          <span className="text-lg font-bold text-zinc-100">
            ${(priceCents / 100).toFixed(2)}
          </span>
        </div>
        <div className="pt-2 border-t border-zinc-800">
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Card Details
          </label>
          <div className="p-3 bg-zinc-950 border border-zinc-700 rounded-md">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "14px",
                    color: "#f4f4f5",
                    "::placeholder": {
                      color: "#71717a",
                    },
                  },
                  invalid: {
                    color: "#ef4444",
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="p-2.5 rounded-md bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <Info className="h-3.5 w-3.5 text-violet-400 shrink-0" />
            <span>Priority Queue Notice</span>
          </div>
          <p className="leading-normal">
            Priority does not guarantee airplay, review, acceptance, or a specific broadcast outcome. Hosts control their own broadcasts and may skip, decline, or remove submissions. Payments are non-refundable except where required by applicable law. See{" "}
            <Link href="/terms#section-4" target="_blank" className="text-violet-400 hover:underline">
              Terms of Service
            </Link>.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isProcessing}
          disabled={!stripe || isProcessing}
          className="gap-2"
        >
          <ShieldCheck className="h-4 w-4" />
          Pay ${(priceCents / 100).toFixed(2)} & Submit
        </Button>
      </div>
    </form>
  );
};

export const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  onSubmissionSuccess,
}) => {
  const [step, setStep] = React.useState<
    "SELECT_TRACK" | "SELECT_TIER" | "PAYMENT" | "SUCCESS"
  >("SELECT_TRACK");
  const [eligibility, setEligibility] =
    React.useState<SubmissionEligibilityResponse | null>(null);
  const [tracks, setTracks] = React.useState<TrackSummary[]>([]);
  const [selectedTrack, setSelectedTrack] = React.useState<TrackSummary | null>(
    null,
  );
  const [selectedTier, setSelectedTier] =
    React.useState<TierEligibilityInfo | null>(null);
  const [isFreeSubmission, setIsFreeSubmission] = React.useState(true);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);

  // Artist Identity State
  const [identities, setIdentities] = React.useState<ArtistIdentitySummary[]>([]);
  const [selectedArtistId, setSelectedArtistId] = React.useState<string>("none");
  const [showAddArtist, setShowAddArtist] = React.useState(false);
  const [newArtistName, setNewArtistName] = React.useState("");
  const [newSpotifyUrl, setNewSpotifyUrl] = React.useState("");
  const [isCreatingArtist, setIsCreatingArtist] = React.useState(false);
  const [artistError, setArtistError] = React.useState<string | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showUploader, setShowUploader] = React.useState(false);

  // Fetch eligibility, tracks, and user artist identities on open
  React.useEffect(() => {
    if (!isOpen) {
      // Reset modal state
      setStep("SELECT_TRACK");
      setSelectedTrack(null);
      setSelectedTier(null);
      setIsFreeSubmission(true);
      setClientSecret(null);
      setError(null);
      setShowUploader(false);
      setShowAddArtist(false);
      setNewArtistName("");
      setNewSpotifyUrl("");
      setArtistError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [eligibilityData, trackList, artistList] = await Promise.all([
          api.liveSessions.getSubmissionEligibility(sessionId),
          api.tracks.list(),
          api.artists.list().catch(() => [] as ArtistIdentitySummary[]),
        ]);
        setEligibility(eligibilityData);
        setTracks(trackList.filter((t) => t.processingState === "READY"));
        setIdentities(artistList || []);

        // Default selection
        if (eligibilityData.free?.available) {
          setIsFreeSubmission(true);
          setSelectedTier(eligibilityData.free);
        } else if (
          eligibilityData.priorityTiers &&
          eligibilityData.priorityTiers.length > 0
        ) {
          const firstAvail = eligibilityData.priorityTiers.find(
            (t) => t.available,
          );
          if (firstAvail) {
            setIsFreeSubmission(false);
            setSelectedTier(firstAvail);
          }
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load submission eligibility");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, sessionId]);

  const handleTrackSelect = (track: TrackSummary) => {
    setSelectedTrack(track);
    if (track.artistIdentityId && identities.some((i) => i.id === track.artistIdentityId)) {
      setSelectedArtistId(track.artistIdentityId);
    } else {
      const defaultId = identities.find((i) => i.isDefault)?.id;
      setSelectedArtistId(defaultId || (identities.length > 0 ? identities[0].id : "none"));
    }
  };

  const handleTrackUploadSuccess = async () => {
    setShowUploader(false);
    try {
      const [trackList, artistList] = await Promise.all([
        api.tracks.list(),
        api.artists.list().catch(() => [] as ArtistIdentitySummary[]),
      ]);
      setTracks(trackList.filter((t) => t.processingState === "READY"));
      setIdentities(artistList || []);
      if (trackList.length > 0) {
        handleTrackSelect(trackList[0]);
      }
    } catch (err) {
      console.error("Failed to refresh tracks", err);
    }
  };

  const handleCreateNewArtistInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtistName.trim()) {
      setArtistError("Artist name is required.");
      return;
    }
    if (newSpotifyUrl.trim()) {
      const check = validateSpotifyUrl(newSpotifyUrl);
      if (!check.valid) {
        setArtistError(check.error || "Invalid Spotify URL.");
        return;
      }
    }

    setIsCreatingArtist(true);
    setArtistError(null);
    try {
      const created = await api.artists.create({
        artistName: newArtistName.trim(),
        spotifyUrl: newSpotifyUrl.trim() || undefined,
        isDefault: identities.length === 0,
      });

      const updatedIdentities = await api.artists.list();
      setIdentities(updatedIdentities);
      setSelectedArtistId(created.id);
      setShowAddArtist(false);
      setNewArtistName("");
      setNewSpotifyUrl("");
    } catch (err: any) {
      setArtistError(err?.message || "Failed to create artist identity.");
    } finally {
      setIsCreatingArtist(false);
    }
  };

  const handleProceedToTier = () => {
    if (!selectedTrack) {
      setError("Please select a track first");
      return;
    }
    setError(null);
    setStep("SELECT_TIER");
  };

  const handleConfirmSubmission = async () => {
    if (!selectedTrack) {
      setError("Please select a track");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Generate unique idempotency key for this submission attempt
    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const effectiveArtistIdentityId =
      selectedArtistId === "none" ? null : selectedArtistId;

    try {
      if (isFreeSubmission) {
        // Free Line Submission
        await api.liveSessions.createSubmission(
          sessionId,
          {
            sourceTrackId: selectedTrack.id,
            artistIdentityId: effectiveArtistIdentityId,
          },
          idempotencyKey,
        );
        setStep("SUCCESS");
        onSubmissionSuccess();
      } else {
        // Priority Tier Submission (requires Stripe payment)
        if (!selectedTier || !selectedTier.tierSnapshotId) {
          throw new Error("Please select a priority tier");
        }

        const res = await api.liveSessions.createSubmission(
          sessionId,
          {
            sourceTrackId: selectedTrack.id,
            artistIdentityId: effectiveArtistIdentityId,
            tierSnapshotId: selectedTier.tierSnapshotId,
          },
          idempotencyKey,
        );

        if (res.clientSecret) {
          setClientSecret(res.clientSecret);
          setStep("PAYMENT");
        } else {
          // If no payment was required
          setStep("SUCCESS");
          onSubmissionSuccess();
        }
      }
    } catch (err: any) {
      setError(
        err?.message || "Failed to create submission. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const currentSelectedArtist =
    selectedArtistId === "none"
      ? null
      : identities.find((i) => i.id === selectedArtistId);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === "PAYMENT"
          ? "Complete Priority Payment"
          : step === "SUCCESS"
            ? "Submission Received!"
            : `Submit Track to ${sessionTitle}`
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800 rounded-md text-red-300 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm text-zinc-400">Loading live station limits...</p>
          </div>
        ) : step === "SUCCESS" ? (
          <div className="text-center py-8 space-y-4">
            <div className="h-14 w-14 bg-emerald-950/50 border border-emerald-800 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">
              You are in the Queue!
            </h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              "{selectedTrack?.songName}" by{" "}
              {selectedTrack?.artistIdentity?.artistName} has been submitted
              successfully. Stay tuned to the stream!
            </p>
            <div className="pt-4">
              <Button variant="primary" onClick={onClose} className="w-full">
                Back to Live Session
              </Button>
            </div>
          </div>
        ) : step === "PAYMENT" && clientSecret && selectedTier ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripePaymentForm
              clientSecret={clientSecret}
              priceCents={selectedTier.priceCents}
              tierName={selectedTier.name}
              onSuccess={() => {
                setStep("SUCCESS");
                onSubmissionSuccess();
              }}
              onError={(msg) => setError(msg)}
              onCancel={() => setStep("SELECT_TIER")}
            />
          </Elements>
        ) : step === "SELECT_TIER" ? (
          <div className="space-y-5">
            {/* Selected Track Summary */}
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <Music className="h-4 w-4 text-violet-400" />
                <span className="font-semibold text-zinc-200">
                  {selectedTrack?.songName}
                </span>
                <span className="text-zinc-400">
                  • {selectedTrack?.artistIdentity?.artistName || "Track"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep("SELECT_TRACK")}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Change Track
              </button>
            </div>

            {/* Artist Identity Attribution Selector */}
            <div className="space-y-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Artist Attribution & Spotify Link
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddArtist(!showAddArtist);
                    setArtistError(null);
                  }}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {showAddArtist ? "Cancel" : "Add New Artist"}
                </button>
              </div>

              {/* Inline Create New Artist Form */}
              {showAddArtist && (
                <form
                  onSubmit={handleCreateNewArtistInline}
                  className="p-3.5 rounded-lg border border-violet-500/40 bg-violet-950/20 space-y-3"
                >
                  <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span>Create New Artist Identity</span>
                  </div>

                  {artistError && (
                    <div className="p-2 rounded bg-red-950/50 border border-red-800 text-[11px] text-red-300 flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{artistError}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Artist Name (e.g. Solar Echo)"
                        value={newArtistName}
                        onChange={(e) => setNewArtistName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="url"
                        placeholder="Spotify Artist URL (e.g. https://open.spotify.com/artist/...)"
                        value={newSpotifyUrl}
                        onChange={(e) => setNewSpotifyUrl(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#1DB954]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddArtist(false)}
                      disabled={isCreatingArtist}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isCreatingArtist}
                      disabled={!newArtistName.trim() || isCreatingArtist}
                      className="text-xs"
                    >
                      Save & Select Artist
                    </Button>
                  </div>
                </form>
              )}

              {/* Artist Choices */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {/* Option 1: No Artist */}
                <div
                  onClick={() => setSelectedArtistId("none")}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    selectedArtistId === "none"
                      ? "border-violet-500 bg-violet-950/20"
                      : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="artistAttribution"
                      checked={selectedArtistId === "none"}
                      onChange={() => setSelectedArtistId("none")}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-200">
                        No Artist
                      </span>
                      <p className="text-[11px] text-zinc-500">
                        Track will be submitted under song name with no artist persona attached
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 2: Owned Artist Identities */}
                {identities.map((identity) => {
                  const isSelected = selectedArtistId === identity.id;
                  return (
                    <div
                      key={identity.id}
                      onClick={() => setSelectedArtistId(identity.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "border-violet-500 bg-violet-950/20"
                          : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="radio"
                          name="artistAttribution"
                          checked={isSelected}
                          onChange={() => setSelectedArtistId(identity.id)}
                          className="h-4 w-4 text-violet-600 focus:ring-violet-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-zinc-100 truncate">
                              {identity.artistName}
                            </span>
                            {identity.isDefault && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                                Default
                              </span>
                            )}
                          </div>
                          {identity.biography && (
                            <p className="text-[11px] text-zinc-400 truncate max-w-xs">
                              {identity.biography}
                            </p>
                          )}
                        </div>
                      </div>

                      {identity.spotifyUrl && (
                        <div
                          className="flex items-center gap-1 text-[11px] text-[#1DB954] bg-[#1DB954]/10 border border-[#1DB954]/20 px-2 py-0.5 rounded shrink-0 ml-2"
                          title={identity.spotifyUrl}
                        >
                          <SpotifyIcon className="h-3 w-3 text-[#1DB954]" />
                          <span className="hidden sm:inline">Spotify Linked</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Select Queue Placement Tier
              </label>

              {/* Free Line Option */}
              {eligibility?.free && (
                <div
                  onClick={() => {
                    if (eligibility.free.available) {
                      setIsFreeSubmission(true);
                      setSelectedTier(eligibility.free);
                    }
                  }}
                  className={`p-4 rounded-lg border transition-all ${
                    isFreeSubmission
                      ? "border-violet-500 bg-violet-950/20"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                  } ${
                    eligibility.free.available
                      ? "cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="tierSelection"
                        checked={isFreeSubmission}
                        disabled={!eligibility.free.available}
                        onChange={() => {
                          setIsFreeSubmission(true);
                          setSelectedTier(eligibility.free);
                        }}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-100">
                            Free Line
                          </span>
                          <Badge variant="info">Standard Queue</Badge>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Standard chronological review by host
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-zinc-200">
                      $0.00
                    </span>
                  </div>
                  {!eligibility.free.available && (
                    <div className="mt-2 pt-2 border-t border-zinc-800/80 text-xs text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{eligibility.free.reason.replace(/_/g, " ")}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Priority Tiers */}
              {eligibility?.priorityTiers &&
                eligibility.priorityTiers.map((tier) => {
                  const isSelected =
                    !isFreeSubmission &&
                    selectedTier?.tierSnapshotId === tier.tierSnapshotId;
                  return (
                    <div
                      key={tier.tierSnapshotId || tier.name}
                      onClick={() => {
                        if (tier.available) {
                          setIsFreeSubmission(false);
                          setSelectedTier(tier);
                        }
                      }}
                      className={`p-4 rounded-lg border transition-all ${
                        isSelected
                          ? "border-violet-500 bg-violet-950/20 shadow-md shadow-violet-900/10"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                      } ${
                        tier.available
                          ? "cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="tierSelection"
                            checked={isSelected}
                            disabled={!tier.available}
                            onChange={() => {
                              setIsFreeSubmission(false);
                              setSelectedTier(tier);
                            }}
                            className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-zinc-100">
                                {tier.name}
                              </span>
                              <Badge variant="info" className="gap-1">
                                <Sparkles className="h-3 w-3" /> Priority Rank{" "}
                                {tier.priorityRank}
                              </Badge>
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              Fast-tracks ahead of free submissions
                            </p>
                          </div>
                        </div>
                        <span className="text-base font-extrabold text-violet-400">
                          {formatCents(tier.priceCents)}
                        </span>
                      </div>
                      {!tier.available && (
                        <div className="mt-2 pt-2 border-t border-zinc-800/80 text-xs text-amber-400 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{tier.reason.replace(/_/g, " ")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Submission Legal & Rights Notice */}
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <p className="leading-relaxed">
                By submitting, you represent that you own all master & publishing rights to this track and grant the broadcaster a limited live review license under our{" "}
                <Link href="/terms" target="_blank" className="text-violet-400 hover:underline">
                  Terms of Service
                </Link>
                . {isFreeSubmission ? "Free Line submissions are reviewed in standard chronological queue order." : "Priority orders fast-track placement without outcome guarantee."}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("SELECT_TRACK")}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmitting}
                disabled={!selectedTier || !selectedTier.available || isSubmitting}
                onClick={handleConfirmSubmission}
                className="gap-2"
              >
                {isFreeSubmission ? (
                  "Submit to Free Line"
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Proceed to Payment ({formatCents(selectedTier?.priceCents || 0)})
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Step 1: SELECT_TRACK */
          <div className="space-y-4">
            {showUploader ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-200">
                    Upload New Track
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUploader(false)}
                  >
                    Choose Existing
                  </Button>
                </div>
                <TrackUploader
                  onSuccess={handleTrackUploadSuccess}
                  onCancel={() => setShowUploader(false)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Select Track from Your Music Library
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploader(true)}
                  >
                    + Upload New Track
                  </Button>
                </div>

                {tracks.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-zinc-800 rounded-lg p-6 space-y-3">
                    <Music className="h-8 w-8 text-zinc-500 mx-auto" />
                    <p className="text-sm text-zinc-300 font-medium">
                      No ready tracks found in your library
                    </p>
                    <p className="text-xs text-zinc-500">
                      Upload your audio first to submit it to live sessions
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowUploader(true)}
                    >
                      Upload Audio Now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {tracks.map((track) => (
                      <TrackItem
                        key={track.id}
                        track={track}
                        onSelect={(t) => setSelectedTrack(t)}
                        isSelected={selectedTrack?.id === track.id}
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!selectedTrack}
                    onClick={handleProceedToTier}
                  >
                    Continue to Queue Placement
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
