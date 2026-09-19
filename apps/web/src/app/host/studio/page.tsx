"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import {
  HostStationDetail,
  StreamingPlatform,
  Role,
  PublicQueueEntry,
  WeeklyTop3Response,
} from "@platform/types";
import { Button, Card, Badge, Input } from "@platform/ui";
import {
  Radio,
  ExternalLink,
  Settings,
  Tv,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Play,
  Square,
  Users,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { HostQueueManager } from "@/components/HostQueueManager";
import { HostPriorityTierManager } from "@/components/HostPriorityTierManager";
import { WeeklyTop3Card } from "@/components/WeeklyTop3Card";
import { HostOverlayPanel } from "@/components/HostOverlayPanel";

export default function HostStudioPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [station, setStation] = React.useState<HostStationDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isGoingLive, setIsGoingLive] = React.useState(false);
  const [isEndingLive, setIsEndingLive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [weeklyTop3, setWeeklyTop3] = React.useState<WeeklyTop3Response | null>(null);
  const [isTop3Loading, setIsTop3Loading] = React.useState(false);

  // Station Configuration Form
  const [description, setDescription] = React.useState("");
  const [primaryPlatform, setPrimaryPlatform] = React.useState<StreamingPlatform>(
    StreamingPlatform.TWITCH,
  );
  const [streamUrl, setStreamUrl] = React.useState("");
  const [acceptedRules, setAcceptedRules] = React.useState("");
  const [explicitAllowed, setExplicitAllowed] = React.useState(true);
  const [maxTrackDuration, setMaxTrackDuration] = React.useState(300);
  const [maxQueueSize, setMaxQueueSize] = React.useState(50);

  // Go Live Form State
  const [showGoLiveModal, setShowGoLiveModal] = React.useState(false);
  const [liveTitle, setLiveTitle] = React.useState("");
  const [liveStreamUrl, setLiveStreamUrl] = React.useState("");
  const [submissionsOpen, setSubmissionsOpen] = React.useState(true);
  const [freeLineOpen, setFreeLineOpen] = React.useState(true);
  const [paidOpen, setPaidOpen] = React.useState(true);

  const loadStation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.host.getStation();
      setStation(data);

      setDescription(data.description || "");
      setPrimaryPlatform(data.primaryStreamingPlatform || StreamingPlatform.TWITCH);
      setStreamUrl(data.streamUrl || "");
      setAcceptedRules(data.acceptedContentRules || "");
      setExplicitAllowed(data.explicitContentAllowed ?? true);
      setMaxTrackDuration(data.maxTrackDurationSeconds || 300);
      setMaxQueueSize(data.maxQueueSize || 50);

      setLiveStreamUrl(data.streamUrl || "");
      setLiveTitle(`${data.stationName} - Live Music Review`);
    } catch (err: any) {
      if (err?.status === 403 || err?.status === 404) {
        router.push("/host/onboarding");
        return;
      }
      setError(err?.message || "Failed to load station details");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTop3 = async () => {
    setIsTop3Loading(true);
    try {
      const top3Data = await api.host.getWeeklyTop3();
      setWeeklyTop3(top3Data);
    } catch {
      // Non-blocking
    } finally {
      setIsTop3Loading(false);
    }
  };

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/host/studio");
      return;
    }

    if (isAuthenticated) {
      loadStation();
      loadTop3();
    }
  }, [isAuthenticated, authLoading]);

  const handleSaveStationConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.host.updateStation({
        description: description.trim() || undefined,
        primaryStreamingPlatform: primaryPlatform,
        streamUrl: streamUrl.trim() || undefined,
        acceptedContentRules: acceptedRules.trim() || undefined,
        explicitContentAllowed: explicitAllowed,
        maxTrackDurationSeconds: Number(maxTrackDuration),
        maxQueueSize: Number(maxQueueSize),
      });
      setStation(updated);
      setSuccessMessage("Station configuration updated successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to update station configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveTitle.trim()) {
      setError("Broadcast title is required");
      return;
    }

    setIsGoingLive(true);
    setError(null);
    try {
      await api.host.goLive({
        liveTitle: liveTitle.trim(),
        primaryStreamingPlatform: primaryPlatform,
        streamUrl: liveStreamUrl.trim() || undefined,
        submissionsOpen,
        freeLineOpen,
        paidSubmissionsOpen: paidOpen,
      });

      setShowGoLiveModal(false);
      setSuccessMessage("Broadcast started! Your station is now LIVE.");
      await loadStation();
    } catch (err: any) {
      setError(err?.message || "Failed to start broadcast");
    } finally {
      setIsGoingLive(false);
    }
  };

  const handleGoOffline = async () => {
    if (!confirm("Are you sure you want to end your live broadcast?")) return;

    setIsEndingLive(true);
    setError(null);
    try {
      await api.host.goOffline();
      setSuccessMessage("Broadcast ended. Station is now offline.");
      await loadStation();
    } catch (err: any) {
      setError(err?.message || "Failed to end broadcast");
    } finally {
      setIsEndingLive(false);
    }
  };

  const copyVanityUrl = () => {
    if (!station) return;
    const url = `${window.location.origin}/${station.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <p className="text-sm text-zinc-400">Loading broadcaster studio...</p>
      </div>
    );
  }

  if (!station) {
    return null;
  }

  const isLive = station.isLive;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-50 flex items-center gap-2.5">
              <Radio
                className={`h-6 w-6 sm:h-7 sm:text-violet-400 ${
                  isLive ? "text-red-500 animate-pulse" : "text-zinc-400"
                }`}
              />
              {station.stationName}
            </h1>
            {isLive ? (
              <Badge variant="success" className="gap-1.5 text-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                LIVE ON AIR
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                OFFLINE
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Host Broadcaster Studio • Manage live queue, stream links, and station configuration
          </p>
        </div>

        {/* Live Control Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {isLive ? (
            <Button
              variant="danger"
              size="md"
              onClick={handleGoOffline}
              disabled={isEndingLive}
              className="gap-2 font-bold shadow-lg shadow-red-950/40 min-h-[44px]"
            >
              {isEndingLive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              End Broadcast
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowGoLiveModal(true)}
              className="gap-2 font-bold shadow-lg shadow-violet-900/30 min-h-[44px]"
            >
              <Play className="h-4 w-4 fill-current" /> Go Live Now
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            onClick={copyVanityUrl}
            className="gap-2 text-xs min-h-[44px]"
          >
            {copiedUrl ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Share Station URL
              </>
            )}
          </Button>

          <Link href={`/${station.slug}`}>
            <Button variant="ghost" size="md" className="gap-2 text-xs min-h-[44px]">
              <ExternalLink className="h-4 w-4" /> Public View
            </Button>
          </Link>
        </div>
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

      {/* If LIVE, show the Interactive Live Host Queue Manager */}
      {isLive && station.currentLiveSessionId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Radio className="h-5 w-5 text-red-500 animate-pulse" /> Live Queue Operations
            </h2>
            <Link
              href={`/session/${station.currentLiveSessionId}`}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
            >
              Open Dedicated Session View <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <HostQueueManager
            sessionId={station.currentLiveSessionId}
            onSessionUpdated={() => {
              loadStation();
              loadTop3();
            }}
          />
        </div>
      )}

      {/* Authoritative Weekly Top 3 Playback Ranking */}
      <WeeklyTop3Card
        data={weeklyTop3}
        isLoading={isTop3Loading}
        onRefresh={loadTop3}
        titlePrefix="Station"
      />

      {/* Priority Tiers Management Panel */}
      <HostPriorityTierManager />

      {/* Stream Overlays Panel */}
      <HostOverlayPanel stationSlug={station.slug} />

      {/* Station Configuration Panel */}
      <Card className="border-zinc-800 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-50">
                Station Settings & Rules
              </h2>
              <p className="text-xs text-zinc-400">
                Configure your public station information, default streaming channel, and queue limits.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveStationConfig} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Primary Streaming Platform
              </label>
              <select
                value={primaryPlatform}
                onChange={(e) => setPrimaryPlatform(e.target.value as StreamingPlatform)}
                className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value={StreamingPlatform.TWITCH}>Twitch</option>
                <option value={StreamingPlatform.YOUTUBE}>YouTube</option>
                <option value={StreamingPlatform.KICK}>Kick</option>
                <option value={StreamingPlatform.TIKTOK}>TikTok</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Channel / Stream URL
              </label>
              <input
                type="url"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://twitch.tv/yourchannel"
                className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Station Description & Bio
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your station, live schedule, and what music you look for..."
              className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Max Track Duration (seconds)
              </label>
              <input
                type="number"
                min={30}
                max={1200}
                value={maxTrackDuration}
                onChange={(e) => setMaxTrackDuration(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
              />
              <p className="text-[11px] text-zinc-500">
                {Math.floor(maxTrackDuration / 60)} minutes {maxTrackDuration % 60} seconds
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Max Queue Capacity
              </label>
              <input
                type="number"
                min={5}
                max={500}
                value={maxQueueSize}
                onChange={(e) => setMaxQueueSize(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
              />
              <p className="text-[11px] text-zinc-500">
                Max total songs waiting in line
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Explicit Content Allowed?
              </label>
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={explicitAllowed}
                    onChange={(e) => setExplicitAllowed(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-xs text-zinc-200 font-medium">
                    {explicitAllowed ? "Yes (Explicit Allowed)" : "No (Clean Music Only)"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Custom Submission Rules & Guidelines
            </label>
            <input
              type="text"
              value={acceptedRules}
              onChange={(e) => setAcceptedRules(e.target.value)}
              placeholder="e.g. Original beats only, no unmixed vocals, drop Soundcloud or MP3 links"
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving}
              className="gap-2 min-h-[44px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Settings...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Save Station Configuration
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Go Live Modal */}
      {showGoLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center">
                  <Radio className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-50">Start Live Broadcast</h3>
                  <p className="text-xs text-zinc-400">Open submissions and your live queue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoLiveModal(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGoLive} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Broadcast / Stream Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  placeholder="e.g. Friday Night Beat Reviews + Feedback"
                  className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Live Stream URL (Twitch, YouTube, Kick, TikTok)
                </label>
                <input
                  type="url"
                  value={liveStreamUrl}
                  onChange={(e) => setLiveStreamUrl(e.target.value)}
                  placeholder="https://twitch.tv/yourchannel"
                  className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={submissionsOpen}
                    onChange={(e) => setSubmissionsOpen(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Open Queue Submissions
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Allow listeners and artists to submit songs to your queue
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeLineOpen}
                    onChange={(e) => setFreeLineOpen(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Enable Standard Free Line
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Standard first-come first-served submissions
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paidOpen}
                    onChange={(e) => setPaidOpen(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Enable Paid Priority Fast-Tracks
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Allow listeners to jump the line with Stripe Connect tiers
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowGoLiveModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isGoingLive}
                  className="gap-2"
                >
                  {isGoingLive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                  Go Live
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
