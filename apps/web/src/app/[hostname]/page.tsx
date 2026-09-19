"use client";

import * as React from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { Button, Badge, Card } from "@platform/ui";
import { PublicStationDetail, PublicQueueEntry, WeeklyTop3Response } from "@platform/types";
import { RESERVED_SLUGS } from "@platform/validation";
import { api } from "@/lib/api";
import {
  Radio,
  ExternalLink,
  Send,
  RefreshCw,
  AlertCircle,
  Loader2,
  Tv,
  ArrowLeft,
  Clock,
  Music,
  ShieldCheck,
  Sparkles,
  Users,
  CheckCircle2,
} from "lucide-react";
import { PublicQueueView } from "@/components/PublicQueueView";
import { SubmissionModal } from "@/components/SubmissionModal";
import { WeeklyTop3Card } from "@/components/WeeklyTop3Card";

export default function StationVanityPage() {
  const params = useParams();
  const hostname = (params?.hostname as string)?.toLowerCase().trim();

  // Guard against reserved routes
  if (RESERVED_SLUGS.includes(hostname as any)) {
    notFound();
  }

  const [station, setStation] = React.useState<PublicStationDetail | null>(null);
  const [queueEntries, setQueueEntries] = React.useState<PublicQueueEntry[]>([]);
  const [weeklyTop3, setWeeklyTop3] = React.useState<WeeklyTop3Response | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = React.useState(false);

  const fetchStationData = async (silent = false) => {
    if (!hostname) return;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const stationData = await api.stations.getByHostname(hostname);
      setStation(stationData);

      if (stationData.isLive && stationData.currentSession?.id) {
        const queueData = await api.liveSessions.getPublicQueue(
          stationData.currentSession.id,
        );
        setQueueEntries(queueData || []);
      }

      // Fetch server-authoritative Weekly Top 3
      try {
        const top3Data = await api.stations.getWeeklyTop3(hostname);
        setWeeklyTop3(top3Data);
      } catch (top3Err) {
        // Non-blocking
      }
    } catch (err: any) {
      if (err?.status === 404) {
        notFound();
      }
      setError(err?.message || "Failed to load station profile");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchStationData();
    const interval = setInterval(() => {
      fetchStationData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [hostname]);

  const getPlatformLabel = (platform?: string) => {
    switch (platform) {
      case "TWITCH":
        return "Twitch";
      case "YOUTUBE":
        return "YouTube";
      case "TIKTOK":
        return "TikTok";
      case "KICK":
        return "Kick";
      default:
        return platform || "Stream";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <p className="text-sm text-zinc-400">Loading broadcaster station...</p>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="text-center py-16 space-y-4 max-w-md mx-auto px-4">
        <div className="h-14 w-14 rounded-full bg-red-950/50 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100">Station Not Available</h2>
        <p className="text-sm text-zinc-400">
          {error || "The requested broadcaster station could not be found."}
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link href="/hosts">
            <Button variant="primary" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Browse Active Stations
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => fetchStationData()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const liveSession = station.currentSession;
  const isLive = station.isLive && liveSession && liveSession.status === "LIVE";

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 md:pb-8">
      {/* Navigation bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link
          href="/hosts"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Stations
        </Link>

        <div className="flex items-center gap-2">
          {isLive ? (
            <Badge variant="success" className="gap-1.5 text-[11px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              ON AIR NOW
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-zinc-500" />
              OFFLINE
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchStationData(true)}
            disabled={isRefreshing}
            className="h-8 px-2 text-xs min-w-[36px]"
            title="Refresh station"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Main Station Header / Card */}
      <Card className="border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={isLive ? "success" : "secondary"}
                className="gap-1.5"
              >
                <Radio className={`h-3.5 w-3.5 ${isLive ? "animate-pulse" : ""}`} />
                {isLive ? "BROADCAST LIVE" : "STATION OFFLINE"}
              </Badge>

              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {getPlatformLabel(station.primaryStreamingPlatform)}
              </span>

              <span className="text-xs font-mono px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/40">
                /{station.slug}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-50 tracking-tight break-words">
                {station.stationName}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-violet-400 mt-0.5">
                Host Broadcaster: {station.hostName}
              </p>
            </div>

            {isLive && liveSession?.liveTitle && (
              <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-0.5">
                  Current Stream Title
                </p>
                <p className="text-sm text-zinc-200 font-medium">
                  {liveSession.liveTitle}
                </p>
              </div>
            )}

            {station.description && (
              <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                {station.description}
              </p>
            )}

            {/* Station Specs & Rules */}
            <div className="flex items-center gap-4 flex-wrap pt-2 text-xs text-zinc-400 border-t border-zinc-800/60">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-zinc-500" />
                Max track duration:{" "}
                <span className="text-zinc-200 font-semibold">
                  {Math.floor(station.maxTrackDurationSeconds / 60)}m{" "}
                  {station.maxTrackDurationSeconds % 60 ? `${station.maxTrackDurationSeconds % 60}s` : ""}
                </span>
              </span>

              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-zinc-500" />
                Max queue size:{" "}
                <span className="text-zinc-200 font-semibold">
                  {station.maxQueueSize} tracks
                </span>
              </span>

              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
                Explicit content:{" "}
                <span
                  className={`font-semibold ${
                    station.explicitContentAllowed ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {station.explicitContentAllowed ? "Allowed" : "Clean Only"}
                </span>
              </span>
            </div>

            {station.acceptedContentRules && (
              <p className="text-xs text-zinc-400 italic">
                Guidelines: {station.acceptedContentRules}
              </p>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 shrink-0">
            {station.streamUrl && (
              <a
                href={station.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 text-sm font-semibold transition-colors min-h-[44px]"
              >
                <Tv className="h-4 w-4 text-violet-400" />
                Watch on {getPlatformLabel(station.primaryStreamingPlatform)}
              </a>
            )}

            {isLive && liveSession && (
              <Button
                variant="primary"
                size="lg"
                disabled={!liveSession.submissionsOpen}
                onClick={() => setIsSubmissionModalOpen(true)}
                className="gap-2 shadow-lg min-h-[44px]"
              >
                <Send className="h-4 w-4" />
                {liveSession.submissionsOpen
                  ? "Submit Track to Queue"
                  : "Submissions Paused"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Server-Authoritative Weekly Top 3 Ranking */}
      <WeeklyTop3Card
        data={weeklyTop3}
        isLoading={isRefreshing}
        onRefresh={() => fetchStationData(true)}
      />

      {/* If Live, display live queue and current track */}
      {isLive && liveSession ? (
        <PublicQueueView
          entries={queueEntries}
          currentTrack={liveSession.currentTrack}
        />
      ) : (
        <Card className="border-dashed border-zinc-800 p-8 text-center space-y-3 bg-zinc-900/30">
          <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
            <Radio className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-200">
            Station is Currently Offline
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            {station.stationName} is not broadcasting right now. When the host begins a live stream, the interactive song queue and submission tiers will appear here automatically.
          </p>
          <div className="pt-2">
            <Link href="/hosts">
              <Button variant="outline" size="sm" className="gap-2">
                <Music className="h-4 w-4 text-violet-400" /> Explore Active Broadcasters
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Submission Modal */}
      {isLive && liveSession && (
        <SubmissionModal
          isOpen={isSubmissionModalOpen}
          onClose={() => setIsSubmissionModalOpen(false)}
          sessionId={liveSession.id}
          sessionTitle={station.stationName}
          onSubmissionSuccess={() => {
            fetchStationData(true);
          }}
        />
      )}
    </div>
  );
}
