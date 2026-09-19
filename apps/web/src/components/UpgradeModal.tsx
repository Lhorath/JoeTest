"use client";

import * as React from "react";
import Link from "next/link";
import {
  Dialog,
  Button,
  Badge,
  Card,
} from "@platform/ui";
import {
  SubmissionEligibilityResponse,
  TierEligibilityInfo,
  UserSubmissionSummary,
} from "@platform/types";
import {
  Sparkles,
  Music,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Loader2,
  Info,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { api } from "../lib/api";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_TYooMQauvdEDq54NiTphI7jx",
);

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: UserSubmissionSummary | null;
  onUpgradeSuccess: () => void;
}

const StripeUpgradePaymentForm: React.FC<{
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
            <span>Priority Queue Upgrade Notice</span>
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
          Pay ${(priceCents / 100).toFixed(2)} & Upgrade
        </Button>
      </div>
    </form>
  );
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  submission,
  onUpgradeSuccess,
}) => {
  const [step, setStep] = React.useState<"SELECT_TIER" | "PAYMENT" | "SUCCESS">("SELECT_TIER");
  const [eligibility, setEligibility] =
    React.useState<SubmissionEligibilityResponse | null>(null);
  const [selectedTier, setSelectedTier] =
    React.useState<TierEligibilityInfo | null>(null);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !submission) {
      setStep("SELECT_TIER");
      setSelectedTier(null);
      setClientSecret(null);
      setError(null);
      return;
    }

    const fetchTiers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const eligibilityData = await api.liveSessions.getSubmissionEligibility(
          submission.liveSessionId,
        );
        setEligibility(eligibilityData);

        if (eligibilityData.priorityTiers && eligibilityData.priorityTiers.length > 0) {
          const firstAvail = eligibilityData.priorityTiers.find((t) => t.available);
          if (firstAvail) setSelectedTier(firstAvail);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load priority tiers");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTiers();
  }, [isOpen, submission]);

  const handleStartUpgrade = async () => {
    if (!submission || !selectedTier || !selectedTier.tierSnapshotId) {
      setError("Please select a priority tier");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `upg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await api.submissions.upgrade(
        submission.id,
        { tierSnapshotId: selectedTier.tierSnapshotId },
        idempotencyKey,
      );

      if (res.clientSecret) {
        setClientSecret(res.clientSecret);
        setStep("PAYMENT");
      } else {
        setStep("SUCCESS");
        onUpgradeSuccess();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to initiate upgrade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === "PAYMENT"
          ? "Complete Upgrade Payment"
          : step === "SUCCESS"
            ? "Upgrade Succeeded!"
            : "Upgrade Track to Priority"
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
            <p className="text-sm text-zinc-400">Loading priority tier options...</p>
          </div>
        ) : step === "SUCCESS" ? (
          <div className="text-center py-8 space-y-4">
            <div className="h-14 w-14 bg-emerald-950/50 border border-emerald-800 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">
              Upgrade Confirmed!
            </h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              "{submission?.songName}" has been promoted to{" "}
              {selectedTier?.name}.
            </p>
            <div className="pt-4">
              <Button variant="primary" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        ) : step === "PAYMENT" && clientSecret && selectedTier ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripeUpgradePaymentForm
              clientSecret={clientSecret}
              priceCents={selectedTier.priceCents}
              tierName={selectedTier.name}
              onSuccess={() => {
                setStep("SUCCESS");
                onUpgradeSuccess();
              }}
              onError={(msg) => setError(msg)}
              onCancel={() => setStep("SELECT_TIER")}
            />
          </Elements>
        ) : (
          <div className="space-y-5">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm space-y-1">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-violet-400" />
                <span className="font-semibold text-zinc-200">
                  {submission?.songName}
                </span>
                <span className="text-zinc-400">• {submission?.artistName}</span>
              </div>
              <p className="text-xs text-zinc-400">
                Live Session: {submission?.sessionTitle} ({submission?.stationName})
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Select Priority Rank Upgrade
              </label>

              {eligibility?.priorityTiers && eligibility.priorityTiers.length > 0 ? (
                eligibility.priorityTiers.map((tier) => {
                  const isSelected = selectedTier?.tierSnapshotId === tier.tierSnapshotId;
                  return (
                    <div
                      key={tier.tierSnapshotId || tier.name}
                      onClick={() => {
                        if (tier.available) setSelectedTier(tier);
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
                            name="upgradeTier"
                            checked={isSelected}
                            disabled={!tier.available}
                            onChange={() => setSelectedTier(tier)}
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
                              Fast-tracks ahead in host live queue
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
                })
              ) : (
                <div className="text-center py-6 border border-zinc-800 rounded-lg text-sm text-zinc-400">
                  No priority tiers currently configured for this session.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmitting}
                disabled={!selectedTier || !selectedTier.available || isSubmitting}
                onClick={handleStartUpgrade}
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Proceed to Payment ({formatCents(selectedTier?.priceCents || 0)})
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
