"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import {
  AdminHostApplicationDetail,
  PlatformSettings,
  HostApplicationStatus,
  Role,
} from "@platform/types";
import { Button, Card, Badge, Input } from "@platform/ui";
import {
  Radio,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Tv,
  ExternalLink,
  Ban,
  Check,
  Loader2,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

export default function AdminHostsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [applications, setApplications] = React.useState<AdminHostApplicationDetail[]>([]);
  const [platformSettings, setPlatformSettings] = React.useState<PlatformSettings | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = React.useState(false);
  const [actionInProgressId, setActionInProgressId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Rejection modal
  const [rejectingAppId, setRejectingAppId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  const isAdmin =
    user?.roles?.includes(Role.OWNER_ADMIN) ||
    user?.roles?.includes(Role.MODERATOR);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [apps, settings] = await Promise.all([
        api.admin.getHostApplications(statusFilter === "ALL" ? undefined : statusFilter),
        api.admin.getPlatformSettings(),
      ]);
      setApplications(apps);
      setPlatformSettings(settings);
    } catch (err: any) {
      setError(err?.message || "Failed to load host applications or platform settings");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      router.push("/admin");
      return;
    }

    if (isAuthenticated && isAdmin) {
      loadData();
    }
  }, [isAuthenticated, authLoading, statusFilter]);

  const handleToggleManualApproval = async (requireManual: boolean) => {
    setIsUpdatingSettings(true);
    setError(null);
    try {
      const updated = await api.admin.updatePlatformSettings({
        requireManualHostApproval: requireManual,
      });
      setPlatformSettings(updated);
      setSuccessMessage(
        requireManual
          ? "Platform policy updated: Manual administrator approval is now REQUIRED for all broadcaster applications."
          : "Platform policy updated: Automatic instant approval enabled for eligible broadcasters with verified Stripe Connect accounts.",
      );
      await loadData(true);
    } catch (err: any) {
      setError(err?.message || "Failed to update platform settings");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    setActionInProgressId(applicationId);
    setError(null);
    try {
      const res = await api.admin.approveHostApplication(applicationId);
      setSuccessMessage(
        res.station?.slug
          ? `Host approved and station activated at /${res.station.slug}!`
          : "Host application approved successfully!",
      );
      await loadData(true);
    } catch (err: any) {
      setError(err?.message || "Failed to approve host application");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAppId) return;

    setActionInProgressId(rejectingAppId);
    setError(null);
    try {
      await api.admin.rejectHostApplication(rejectingAppId, {
        reason: rejectionReason,
      });
      setSuccessMessage("Host application rejected.");
      setRejectingAppId(null);
      setRejectionReason("");
      await loadData(true);
    } catch (err: any) {
      setError(err?.message || "Failed to reject host application");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleSuspend = async (applicationId: string) => {
    if (!confirm("Are you sure you want to suspend this host broadcaster and disable their public station?")) {
      return;
    }

    setActionInProgressId(applicationId);
    setError(null);
    try {
      await api.admin.suspendHost(applicationId);
      setSuccessMessage("Host and station have been suspended.");
      await loadData(true);
    } catch (err: any) {
      setError(err?.message || "Failed to suspend host");
    } finally {
      setActionInProgressId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <p className="text-sm text-zinc-400">Loading broadcaster administration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin HQ
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-50 flex items-center gap-2.5">
            <Radio className="h-6 w-6 sm:h-7 text-amber-500" />
            Broadcaster Applications & Host Approvals
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Review incoming broadcaster applications, inspect Stripe Connect readiness, toggle approval policies, and manage stations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(true)}
          className="gap-2 self-start sm:self-auto min-h-[44px]"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-100">Notice</p>
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

      {/* Platform Approval Policy Control Card */}
      <Card className="border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-violet-400" />
              <h2 className="text-base font-bold text-zinc-100">
                Broadcaster Onboarding Policy
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Control whether incoming broadcaster applications require manual administrator review or automatically activate once Stripe Connect onboarding is verified.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={isUpdatingSettings}
              onClick={() =>
                handleToggleManualApproval(!platformSettings?.requireManualHostApproval)
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                platformSettings?.requireManualHostApproval
                  ? "bg-violet-600"
                  : "bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  platformSettings?.requireManualHostApproval
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-xs font-bold text-zinc-200">
              {platformSettings?.requireManualHostApproval
                ? "Manual Review (Required)"
                : "Auto-Approval (Active)"}
            </span>
          </div>
        </div>
      </Card>

      {/* Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {["ALL", "SUBMITTED", "APPROVED", "REJECTED", "SUSPENDED"].map((filter) => {
          const isSelected = statusFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                isSelected
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {filter === "ALL" ? "All Applications" : filter}
            </button>
          );
        })}
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card className="border-dashed border-zinc-800 p-12 text-center space-y-3 bg-zinc-900/30">
          <Radio className="h-8 w-8 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-zinc-200">
            No Broadcaster Applications Found
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {statusFilter === "ALL"
              ? "There are no broadcaster applications in the system yet."
              : `No applications with status "${statusFilter}".`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const isPending = app.status === HostApplicationStatus.SUBMITTED;
            const isApproved = app.status === HostApplicationStatus.APPROVED;
            const isRejected = app.status === HostApplicationStatus.REJECTED;
            const isSuspended = app.status === HostApplicationStatus.SUSPENDED;
            const isStripeReady = app.isEligibleForApproval;

            return (
              <Card
                key={app.id}
                className="border-zinc-800 bg-zinc-900/60 p-6 space-y-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Host Identity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-lg font-bold text-zinc-100">
                        {app.publicHostName}
                      </h3>
                      <Badge
                        variant={
                          isApproved
                            ? "success"
                            : isRejected
                              ? "danger"
                              : isSuspended
                                ? "danger"
                                : "warning"
                        }
                        className="text-[10px] font-bold"
                      >
                        {app.status}
                      </Badge>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
                        {app.primaryStreamingPlatform}
                      </span>
                      <span className="text-xs text-zinc-400">
                        Country: <span className="text-zinc-200">{app.country}</span>
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400">
                      Applicant:{" "}
                      <span className="text-zinc-200 font-medium">
                        {app.applicantUser?.displayName || app.applicantUser?.email}
                      </span>{" "}
                      • Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                    </p>

                    {app.stationSlug && (
                      <p className="text-xs text-violet-400 font-mono">
                        Active Station:{" "}
                        <Link
                          href={`/${app.stationSlug}`}
                          className="hover:underline font-bold inline-flex items-center gap-1"
                        >
                          /{app.stationSlug} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </p>
                    )}
                  </div>

                  {/* Stripe Connect Readiness Badge & Channel Link */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href={app.primaryStreamingProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
                    >
                      <Tv className="h-3.5 w-3.5 text-violet-400" /> Channel Profile
                    </a>

                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        isStripeReady
                          ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                          : "bg-amber-950/40 border-amber-800 text-amber-300"
                      }`}
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      {isStripeReady
                        ? "Stripe Verified & Ready"
                        : "Stripe Incomplete"}
                    </div>
                  </div>
                </div>

                {/* Bio & Rules if available */}
                {(app.biography || app.acceptedGenres) && (
                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs space-y-1">
                    {app.biography && (
                      <p className="text-zinc-300 leading-relaxed">
                        <span className="font-semibold text-zinc-400">Bio:</span>{" "}
                        {app.biography}
                      </p>
                    )}
                    {app.acceptedGenres && (
                      <p className="text-zinc-400">
                        <span className="font-semibold text-zinc-400">Genres:</span>{" "}
                        {app.acceptedGenres}
                      </p>
                    )}
                  </div>
                )}

                {/* Rejection Notice if rejected */}
                {isRejected && app.userFacingRejectionReason && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300">
                    <span className="font-bold text-red-200">Rejection Reason:</span>{" "}
                    {app.userFacingRejectionReason}
                  </div>
                )}

                {/* Administrator Action Bar */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800/80">
                  {isPending && (
                    <>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={actionInProgressId === app.id || !isStripeReady}
                        onClick={() => handleApprove(app.id)}
                        className="gap-1.5"
                        title={
                          !isStripeReady
                            ? "Stripe Connect onboarding must be complete before approval"
                            : "Approve application and provision host station"
                        }
                      >
                        {actionInProgressId === app.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve & Activate Station
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actionInProgressId === app.id}
                        onClick={() => setRejectingAppId(app.id)}
                        className="gap-1.5 text-red-400 hover:text-red-300"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}

                  {isApproved && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actionInProgressId === app.id}
                      onClick={() => handleSuspend(app.id)}
                      className="gap-1.5 text-red-400 hover:bg-red-950/30"
                    >
                      <Ban className="h-3.5 w-3.5" /> Suspend Broadcaster
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-50">
                Reject Broadcaster Application
              </h3>
              <button
                type="button"
                onClick={() => setRejectingAppId(null)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Reason for Rejection (User-Facing)
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why the application is being rejected or what details need correction..."
                  className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingAppId(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={actionInProgressId !== null}
                >
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
