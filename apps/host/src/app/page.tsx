"use client";

import * as React from "react";
import Link from "next/link";
import { Card, Button, Badge } from "@platform/ui";
import {
  Radio,
  Users,
  Sparkles,
  Play,
  Layers,
  ArrowRight,
  Disc3,
  CheckCircle2,
} from "lucide-react";
import { useHostLiveSession } from "../providers/HostLiveSessionProvider";
import { useAuth } from "../providers/AuthProvider";

export default function HostOverviewPage() {
  const { sessionId, liveSession, queue } = useHostLiveSession();
  const { user, isHost } = useAuth();

  const priorityCount = queue.filter((e) => e.submission.isPriority).length;

  return (
    <div className="space-y-8">
      {/* Welcome Broadcast Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 p-8 md:p-10 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="text-xs px-3 py-0.5">
                Host Control Center
              </Badge>
              {sessionId ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Session Attached
                </span>
              ) : (
                <span className="text-xs text-zinc-500 font-mono">
                  Standby Mode
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-50">
              Welcome Back{user?.displayName ? `, ${user.displayName}` : ""}.
            </h1>

            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              Arm your live audio player, review priority and free line
              submissions, enforce the 2-minute qualification rule, and manage
              broadcast state in real-time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link href="/queue">
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-6 shadow-xl shadow-amber-600/20"
              >
                <Radio className="mr-2 h-5 w-5" /> Launch Live DJ Deck
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4 border-zinc-800 bg-zinc-900/30">
          <div className="p-3 rounded-xl bg-amber-600/10 text-amber-500 border border-amber-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium">
              Queue Submissions
            </span>
            <h4 className="text-2xl font-bold text-zinc-100">
              {queue.length} Tracks
            </h4>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 border-zinc-800 bg-zinc-900/30">
          <div className="p-3 rounded-xl bg-violet-600/10 text-violet-400 border border-violet-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium">
              Priority Submissions
            </span>
            <h4 className="text-2xl font-bold text-zinc-100">
              {priorityCount} VIP
            </h4>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 border-zinc-800 bg-zinc-900/30">
          <div className="p-3 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
            <Disc3 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium">
              Master Deck
            </span>
            <h4 className="text-xl font-bold text-zinc-100">
              {liveSession?.currentQueueEntryId ? "Loaded" : "Idle"}
            </h4>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 border-zinc-800 bg-zinc-900/30">
          <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <Play className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium">
              Broadcast Status
            </span>
            <h4 className="text-xl font-bold text-zinc-100 uppercase">
              {liveSession?.status || "Standby"}
            </h4>
          </div>
        </Card>
      </section>

      {/* Quick Launch Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4 border-zinc-800 bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-11 w-11 rounded-xl bg-amber-600/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
              <Radio className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">
              Live DJ Deck & Queue Engine
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Open the low-latency host dashboard to advance tracks, preview
              artwork, scrub audio, and trigger authoritative Next actions.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/queue">
              <Button
                variant="outline"
                size="md"
                className="w-full border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 font-semibold flex items-center justify-center gap-2"
              >
                Open DJ Control Deck <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6 space-y-4 border-zinc-800 bg-zinc-950 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">
              2-Minute Qualification Standard
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              TheQueue protects artists and stream integrity: tracks loaded for
              over 120 seconds automatically qualify into stream history.
            </p>
          </div>
          <div className="pt-4 text-xs font-mono text-zinc-500 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80">
            Authoritative Revision Concurrency Enabled
          </div>
        </Card>
      </section>
    </div>
  );
}
