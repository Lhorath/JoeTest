"use client";

import * as React from "react";
import { Badge, Card, Button } from "@platform/ui";
import { WeeklyTop3Response, WeeklyTop3Item } from "@platform/types";
import {
  Trophy,
  Award,
  Medal,
  Music,
  ExternalLink,
  Clock,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Flame,
} from "lucide-react";
import { SpotifyIcon } from "./PublicQueueView";

interface WeeklyTop3CardProps {
  data: WeeklyTop3Response | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  titlePrefix?: string;
}

export const WeeklyTop3Card: React.FC<WeeklyTop3CardProps> = ({
  data,
  isLoading = false,
  onRefresh,
  titlePrefix,
}) => {
  const [showInfo, setShowInfo] = React.useState(false);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-xs">
            <Trophy className="h-4 w-4 text-amber-400 fill-amber-400/20" />
            <span>1ST PLACE</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-400/15 border border-slate-400/30 text-slate-200 font-black text-xs">
            <Medal className="h-4 w-4 text-slate-300 fill-slate-300/20" />
            <span>2ND PLACE</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-700/15 border border-orange-600/30 text-orange-300 font-black text-xs">
            <Award className="h-4 w-4 text-orange-400 fill-orange-400/20" />
            <span>3RD PLACE</span>
          </div>
        );
      default:
        return (
          <div className="px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-bold">
            #{rank}
          </div>
        );
    }
  };

  const getCardBorder = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-zinc-900/60 to-zinc-900/80";
      case 2:
        return "border-slate-400/30 bg-gradient-to-r from-slate-900/40 via-zinc-900/60 to-zinc-900/80";
      case 3:
        return "border-orange-600/30 bg-gradient-to-r from-orange-950/20 via-zinc-900/60 to-zinc-900/80";
      default:
        return "border-zinc-800 bg-zinc-900/50";
    }
  };

  return (
    <Card className="border-zinc-800 p-6 sm:p-7 space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100 flex items-center gap-2.5">
              <Trophy className="h-6 w-6 text-amber-400 fill-amber-400/20" />
              {titlePrefix ? `${titlePrefix} Weekly Top 3` : "Weekly Top 3"}
            </h2>
            <Badge variant="secondary" className="text-xs bg-zinc-800/80 text-zinc-300 border-zinc-700">
              Authoritative
            </Badge>
          </div>
          {data?.period && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span>
                Window: <strong className="text-zinc-200">{data.period.formattedRange}</strong> ({data.period.timeZone})
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 italic">Resets Saturday at 00:00 America/New_York</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 transition-colors"
            title="Qualification rules"
          >
            <HelpCircle className="h-3.5 w-3.5 text-violet-400" />
            Rules
          </button>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-1.5 text-xs min-h-[36px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Info explanation banner (collapsible) */}
      {showInfo && (
        <div className="p-4 rounded-lg bg-violet-950/30 border border-violet-800/40 text-xs text-zinc-300 space-y-2 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-violet-300">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span>How Songs Qualify for Weekly Top 3</span>
          </div>
          <p>
            Rankings are derived strictly from immutable server playback events. To count as a qualifying play, a track must complete at least <strong>120 seconds of continuous playback</strong> in the player.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-zinc-400">
            <li><strong>Normal plays</strong> are rate-limited to once every 4 hours per track to prevent duplicate manipulation.</li>
            <li><strong>Paid priority plays</strong> count immediately upon 120s qualification.</li>
            <li><strong>Saturday 00:00 America/New_York</strong> resets the weekly period deterministically.</li>
          </ul>
        </div>
      )}

      {/* Rankings List or Empty State */}
      {data && data.items && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((item) => (
            <div
              key={item.trackId}
              className={`p-4 sm:p-5 rounded-xl border ${getCardBorder(item.rank)} transition-all hover:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0">{getRankBadge(item.rank)}</div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base sm:text-lg font-bold text-zinc-100 truncate">
                      {item.songName}
                    </h4>
                    {item.rank === 1 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Flame className="h-3 w-3 fill-amber-400 text-amber-400" /> #1 Stream Track
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-zinc-400 truncate">
                    by <span className="text-zinc-200 font-semibold">{item.artistName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80 shrink-0">
                {/* Play Count metric */}
                <div className="text-left sm:text-right">
                  <p className="text-base sm:text-xl font-black text-zinc-100 font-mono">
                    {item.qualifyingPlayCount}
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    {item.qualifyingPlayCount === 1 ? "Qualifying Play" : "Qualifying Plays"}
                  </p>
                </div>

                {/* Spotify Profile action */}
                {item.spotifyUrl && (
                  <a
                    href={item.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954] text-xs font-semibold transition-colors min-h-[36px]"
                    title="Listen on Spotify"
                  >
                    <SpotifyIcon className="h-3.5 w-3.5 fill-[#1DB954]" />
                    <span className="hidden sm:inline">Spotify</span>
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center space-y-2.5">
          <div className="h-11 w-11 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
            <Trophy className="h-5 w-5 text-zinc-600" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-zinc-200">
            No Qualifying Plays This Week
          </h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Tracks will appear here as soon as they complete at least 120 seconds of continuous playback during this station's live sessions.
          </p>
        </div>
      )}

      {/* Footer note */}
      <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-800/60">
        <span>Station Authoritative Playback Analytics</span>
        <span>120s Continuous Play Rule Enforced</span>
      </div>
    </Card>
  );
};
