"use client";

import * as React from "react";
import { Card, Button, Badge } from "@platform/ui";
import {
  Music,
  Radio,
  Send,
  Play,
  Users,
  Disc,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Headphones,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { api } from "../lib/api";
import { PublicLiveSessionSummary } from "@platform/types";
import { LiveStationCard } from "../components/LiveStationCard";

export default function HomePage() {
  const [liveSessions, setLiveSessions] = React.useState<PublicLiveSessionSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchLive = async () => {
      try {
        const data = await api.liveSessions.getPublic();
        setLiveSessions(data);
      } catch (err) {
        console.error("Failed to load live sessions", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLive();
  }, []);

  return (
    <div className="space-y-12 sm:space-y-16 pb-8">
      {/* Hero Section */}
      <section className="text-center py-8 sm:py-14 md:py-18 max-w-4xl mx-auto space-y-5 px-2">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
            <Radio className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
            Live Music Review Companion
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-zinc-100 leading-tight">
          Submit Music Directly to{" "}
          <span className="text-violet-400">Broadcaster Queues</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          Upload your tracks once to your private library, submit to live stream hosts across Twitch, YouTube, Kick, and TikTok, and follow your song review live on stream.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-4 max-w-md mx-auto sm:max-w-none">
          <Link href="/library" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto shadow-md gap-2"
            >
              <Music className="h-4 w-4" /> Manage Music Library
            </Button>
          </Link>
          <Link href="/hosts" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
              <Radio className="h-4 w-4" /> Browse Live Stations
              {liveSessions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded bg-violet-600/30 text-violet-300 text-xs font-mono">
                  {liveSessions.length}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </section>

      {/* How it Works 3-Step Flow */}
      <section className="space-y-4">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-lg sm:text-xl font-bold text-zinc-100">
            How TheQueue Works
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Synchronized live queues connecting independent artists directly with stream broadcasters
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="border-zinc-800/80 bg-zinc-900/40 p-5 space-y-3">
            <div className="h-9 w-9 rounded-lg bg-violet-600/15 text-violet-400 font-mono text-sm font-bold flex items-center justify-center border border-violet-500/20">
              01
            </div>
            <h3 className="text-base font-bold text-zinc-100">Upload Your Music</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Add audio files (.mp3, .wav, .flac) with complete metadata to your reusable personal library once.
            </p>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/40 p-5 space-y-3">
            <div className="h-9 w-9 rounded-lg bg-amber-600/15 text-amber-400 font-mono text-sm font-bold flex items-center justify-center border border-amber-500/20">
              02
            </div>
            <h3 className="text-base font-bold text-zinc-100">Pick Station & Line</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Find an active broadcaster. Choose standard free submission or unlock fast-track priority tiers.
            </p>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/40 p-5 space-y-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600/15 text-emerald-400 font-mono text-sm font-bold flex items-center justify-center border border-emerald-500/20">
              03
            </div>
            <h3 className="text-base font-bold text-zinc-100">Hear It Live on Air</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Watch the host deck play your song, get feedback in real time, and track your queue progression live.
            </p>
          </Card>
        </div>
      </section>

      {/* Live Now Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100">
              Live Stations Broadcasting Now
            </h2>
          </div>
          <Link
            href="/hosts"
            className="text-xs sm:text-sm font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 min-h-[44px] items-center"
          >
            View All ({liveSessions.length}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl border border-zinc-800 bg-zinc-900/30 animate-pulse"
              />
            ))}
          </div>
        ) : liveSessions.length === 0 ? (
          <Card className="text-center py-10 border-zinc-800 bg-zinc-900/20 p-6 space-y-3">
            <Radio className="h-8 w-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">
              No broadcaster stations are currently on air
            </p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Broadcasters will appear here when they start a live session. Prepare your tracks in advance!
            </p>
            <div className="pt-1">
              <Link href="/library">
                <Button variant="primary" size="sm">
                  Prepare Tracks in Library
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {liveSessions.slice(0, 6).map((session) => (
              <LiveStationCard
                key={session.id}
                station={{
                  id: session.stationId || session.id,
                  stationName: session.stationName,
                  hostName: session.hostName,
                  slug: session.stationSlug || session.id,
                  primaryStreamingPlatform: session.primaryStreamingPlatform,
                  streamUrl: session.streamUrl || null,
                  description: null,
                  isLive: true,
                  liveSessionId: session.id,
                  liveTitle: session.liveTitle || null,
                  submissionsOpen: session.submissionsOpen,
                  paidSubmissionsOpen: session.paidSubmissionsOpen,
                  freeLineOpen: session.freeLineOpen,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
