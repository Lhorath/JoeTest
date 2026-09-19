"use client";

import * as React from "react";
import { Card, Badge, Button } from "@platform/ui";
import {
  Radio,
  ExternalLink,
  Send,
  Sparkles,
  Copy,
  Check,
  Clock,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export interface StationCardData {
  id: string;
  stationName: string;
  hostName: string;
  slug: string;
  primaryStreamingPlatform: string;
  streamUrl?: string | null;
  description?: string | null;
  isLive: boolean;
  liveSessionId?: string | null;
  liveTitle?: string | null;
  submissionsOpen?: boolean;
  paidSubmissionsOpen?: boolean;
  freeLineOpen?: boolean;
  maxTrackDurationSeconds?: number;
  explicitContentAllowed?: boolean;
}

interface LiveStationCardProps {
  station: StationCardData;
}

export const LiveStationCard: React.FC<LiveStationCardProps> = ({ station }) => {
  const [copied, setCopied] = React.useState(false);

  const getPlatformLabel = (platform: string) => {
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
        return platform;
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/${station.slug}`
        : `/${station.slug}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isLive = station.isLive;

  return (
    <Card className="flex flex-col justify-between border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-all p-4 sm:p-6 space-y-4">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge
            variant={isLive ? "success" : "secondary"}
            className="flex items-center gap-1.5"
          >
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLive ? "bg-emerald-500" : "bg-zinc-500"
                }`}
              ></span>
            </span>
            {isLive ? "ON AIR NOW" : "OFFLINE"}
          </Badge>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              {getPlatformLabel(station.primaryStreamingPlatform)}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-violet-950/40 text-violet-300 border border-violet-800/30">
              /{station.slug}
            </span>
          </div>
        </div>

        {/* Station Info */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-100 line-clamp-1">
            {station.stationName}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-violet-400">
            Hosted by {station.hostName}
          </p>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
            {isLive && station.liveTitle
              ? station.liveTitle
              : station.description || "Official broadcaster station on TheQueue."}
          </p>
        </div>

        {/* Submissions & Specs Flags */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
          {isLive ? (
            <>
              {station.submissionsOpen ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                  <Send className="h-3 w-3" /> Submissions Open
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[11px] font-semibold">
                  Submissions Closed
                </span>
              )}

              {station.paidSubmissionsOpen && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-semibold">
                  <Sparkles className="h-3 w-3" /> Priority Line
                </span>
              )}
            </>
          ) : (
            <>
              {station.maxTrackDurationSeconds && (
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                  <Clock className="h-3 w-3 text-zinc-500" /> Max{" "}
                  {Math.floor(station.maxTrackDurationSeconds / 60)}m
                </span>
              )}
              {station.explicitContentAllowed !== undefined && (
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 ml-2">
                  <ShieldCheck className="h-3 w-3 text-zinc-500" />{" "}
                  {station.explicitContentAllowed ? "Explicit Allowed" : "Clean Only"}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="pt-4 border-t border-zinc-800/80 flex items-center gap-2">
        <Link href={`/${station.slug}`} className="flex-1">
          <Button
            variant={isLive ? "primary" : "secondary"}
            size="sm"
            className={`w-full gap-1.5 min-h-[44px] ${
              isLive
                ? "bg-violet-600 hover:bg-violet-500 text-white font-bold"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            }`}
          >
            <Radio className="h-4 w-4" />
            {isLive ? "Tune In Live" : "Visit Station"}
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          title="Copy Station Link"
          className="min-h-[44px] min-w-[44px] px-2 text-zinc-400 hover:text-zinc-200"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>

        {station.streamUrl && (
          <a
            href={station.streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open broadcast stream in new tab"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Watch External Stream"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </Card>
  );
};

