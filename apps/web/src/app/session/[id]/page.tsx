"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Card } from "@platform/ui";
import {
  PublicLiveSessionDetail,
  PublicQueueEntry,
  WeeklyTop3Response,
} from "@platform/types";
import {
  Radio,
  ExternalLink,
  Send,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  User,
  ArrowLeft,
  Tv,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useLiveSocket } from "../../../hooks/useLiveSocket";
import { PublicQueueView } from "../../../components/PublicQueueView";
import { SubmissionModal } from "../../../components/SubmissionModal";
import { WeeklyTop3Card } from "../../../components/WeeklyTop3Card";

export default function PublicSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const [session, setSession] = React.useState<PublicLiveSessionDetail | null>(null);
  const [queueEntries, setQueueEntries] = React.useState<PublicQueueEntry[]>([]);
  const [weeklyTop3, setWeeklyTop3] = React.useState<WeeklyTop3Response | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = React.useState(false);

  // Authoritative data fetch
  const fetchSessionData = async (silent = false) => {
    if (!sessionId) return;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [sessionData, queueData] = await Promise.all([
        api.liveSessions.getPublicById(sessionId),
        api.liveSessions.getPublicQueue(sessionId),
      ]);
      setSession(sessionData);
      setQueueEntries(queueData);

      try {
        const top3Data = await api.liveSessions.getWeeklyTop3(sessionId);
        setWeeklyTop3(top3Data);
      } catch {
        // Non-blocking
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load live session details");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Socket connection to session:PUBLIC:${sessionId}
  const { isConnected, socketError } = useLiveSocket(sessionId, {
    onReconcile: () => {
      fetchSessionData(true);
    },
    onSessionEnded: () => {
      fetchSessionData(true);
    },
    onSessionPaused: () => {
      fetchSessionData(true);
    },
    onSessionStarted: () => {
      fetchSessionData(true);
    },
  });

  React.useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

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
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <p className="text-sm text-zinc-400">Connecting to live station...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-16 space-y-4 max-w-md mx-auto px-4">
        <div className="h-14 w-14 rounded-full bg-red-950/50 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100">
          Session Not Available
        </h2>
        <p className="text-sm text-zinc-400">
          {error || "The requested live session could not be found or has ended."}
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link href="/hosts">
            <Button variant="primary" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Browse Active Stations
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSessionData()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isLive = session.status === "LIVE";
  const isPaused = session.status === "PAUSED";
  const isEnded = session.status === "ENDED" || session.status === "CANCELLED";

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 md:pb-8">
      {/* Top Navigation & Status */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link
          href="/hosts"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Stations
        </Link>

        {/* Real-time Socket Indicator */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="success" className="gap-1 text-[11px]">
              <Wifi className="h-3 w-3" /> Live Synced
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1 text-[11px]">
              <WifiOff className="h-3 w-3" /> Reconnecting...
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchSessionData(true)}
            disabled={isRefreshing}
            className="h-8 px-2 text-xs min-w-[36px]"
            title="Refresh session queue"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Main Station Banner */}
      <Card className="border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={isLive ? "success" : isPaused ? "warning" : "secondary"}
                className="gap-1.5"
              >
                <span className="relative flex h-2 w-2">
                  {isLive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isLive
                        ? "bg-emerald-500"
                        : isPaused
                          ? "bg-amber-500"
                          : "bg-zinc-500"
                    }`}
                  ></span>
                </span>
                {isLive ? "BROADCAST LIVE" : isPaused ? "STREAM PAUSED" : "SESSION ENDED"}
              </Badge>

              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {getPlatformLabel(session.primaryStreamingPlatform)}
              </span>

              {session.submissionsOpen ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                  <Send className="h-3 w-3" /> Submissions Open
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs font-semibold">
                  Submissions Closed
                </span>
              )}
            </div>

            <div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-zinc-50 tracking-tight break-words">
                {session.stationName}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-violet-400 mt-0.5">
                Host: {session.hostName}
              </p>
            </div>

            {session.liveTitle && (
              <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                {session.liveTitle}
              </p>
            )}

            {session.hostBio && (
              <p className="text-xs text-zinc-400 italic pt-1 border-t border-zinc-800/80">
                "{session.hostBio}"
              </p>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {session.streamUrl && (
              <a
                href={session.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 text-sm font-semibold transition-colors min-h-[44px]"
              >
                <Tv className="h-4 w-4 text-violet-400" />
                Watch on {getPlatformLabel(session.primaryStreamingPlatform)}
              </a>
            )}

            <Button
              variant="primary"
              size="lg"
              disabled={!session.submissionsOpen || isEnded}
              onClick={() => setIsSubmissionModalOpen(true)}
              className="gap-2 shadow-lg min-h-[44px]"
            >
              <Send className="h-4 w-4" />
              {session.submissionsOpen
                ? "Submit Track to Queue"
                : isEnded
                  ? "Session Has Ended"
                  : "Submissions Closed"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Authoritative Weekly Top 3 Ranking */}
      <WeeklyTop3Card
        data={weeklyTop3}
        isLoading={isRefreshing}
        onRefresh={() => fetchSessionData(true)}
      />

      {/* Live Queue & Now Playing Section */}
      <PublicQueueView
        entries={queueEntries}
        currentTrack={session.currentTrack}
      />

      {/* Sticky Bottom Bar on Mobile for Quick Submission */}
      {session.submissionsOpen && !isEnded && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-md md:hidden z-40">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsSubmissionModalOpen(true)}
            className="w-full gap-2 font-bold shadow-lg shadow-violet-900/40 min-h-[44px]"
          >
            <Send className="h-4 w-4" /> Submit Track to Queue
          </Button>
        </div>
      )}

      {/* Submission Modal */}
      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        sessionId={session.id}
        sessionTitle={session.stationName}
        onSubmissionSuccess={() => {
          fetchSessionData(true);
        }}
      />
    </div>
  );
}
