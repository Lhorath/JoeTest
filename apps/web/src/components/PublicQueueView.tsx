"use client";

import * as React from "react";
import { Badge, Card } from "@platform/ui";
import { PublicQueueEntry } from "@platform/types";
import { Music, Clock, Sparkles, Disc, Radio, Volume2, Layers, ExternalLink } from "lucide-react";

export function SpotifyIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308c-.215.353-.676.467-1.029.252-2.824-1.725-6.379-2.115-10.567-1.158-.403.092-.808-.16-.9-.562-.093-.404.159-.808.562-.901 4.585-1.048 8.52-.607 11.682 1.34.353.216.467.676.252 1.029zm1.47-3.262c-.27.44-.848.58-1.288.31-3.232-1.986-8.159-2.56-11.982-1.398-.497.151-1.03-.131-1.181-.628-.152-.497.131-1.03.628-1.181 4.372-1.327 9.803-.687 13.513 1.609.44.27.58.848.31 1.288zm.126-3.41c-3.876-2.302-10.27-2.514-13.985-1.386-.594.18-1.226-.154-1.407-.748-.18-.593.154-1.226.748-1.407 4.273-1.298 11.332-1.05 15.794 1.598.534.317.708 1.01.391 1.544-.318.533-1.011.708-1.541.399z" />
    </svg>
  );
}

interface PublicQueueViewProps {
  entries: PublicQueueEntry[];
  currentTrack: {
    songName: string;
    artistName: string;
    durationSeconds: number;
    spotifyUrl?: string | null;
  } | null;
}

export const PublicQueueView: React.FC<PublicQueueViewProps> = ({
  entries,
  currentTrack,
}) => {
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTierColorClass = (colorSlot: string, isPriority: boolean) => {
    if (!isPriority) return "bg-zinc-800 text-zinc-300 border-zinc-700";
    switch (colorSlot) {
      case "TIER_COLOR_1":
        return "bg-violet-950/80 text-violet-300 border-violet-700/80";
      case "TIER_COLOR_2":
        return "bg-amber-950/80 text-amber-300 border-amber-700/80";
      case "TIER_COLOR_3":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-700/80";
      case "TIER_COLOR_4":
        return "bg-rose-950/80 text-rose-300 border-rose-700/80";
      default:
        return "bg-violet-950/80 text-violet-300 border-violet-700/80";
    }
  };

  const priorityCount = entries.filter((e) => e.isPriority).length;
  const freeCount = entries.filter((e) => !e.isPriority).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Now Playing Banner */}
      {currentTrack && (
        <div className="p-4 sm:p-5 rounded-xl border border-violet-500/40 bg-gradient-to-r from-violet-950/40 via-zinc-900 to-zinc-900 shadow-lg shadow-violet-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-12 w-12 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 relative overflow-hidden">
              <Volume2 className="h-6 w-6 text-violet-400" />
              <div className="absolute bottom-1 flex items-end gap-0.5 h-2">
                <span className="w-1 bg-violet-400 animate-pulse h-full rounded-sm"></span>
                <span className="w-1 bg-violet-400 animate-pulse h-2/3 rounded-sm"></span>
                <span className="w-1 bg-violet-400 animate-pulse h-4/5 rounded-sm"></span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wider">
                  Live On Deck
                </Badge>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-zinc-50 mt-0.5 truncate">
                {currentTrack.songName}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                {currentTrack.artistName && (
                  <p className="text-xs sm:text-sm font-medium text-violet-300 truncate">
                    {currentTrack.artistName}
                  </p>
                )}
                {currentTrack.spotifyUrl && (
                  <a
                    href={currentTrack.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954] text-[11px] font-semibold transition-colors"
                    title={currentTrack.artistName ? `Open ${currentTrack.artistName} on Spotify` : "Open Spotify Profile"}
                  >
                    <SpotifyIcon className="h-3 w-3 text-[#1DB954]" />
                    <span>Spotify</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center text-xs font-mono text-zinc-400 bg-zinc-950/80 px-3 py-1.5 rounded-md border border-zinc-800 shrink-0">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span>{formatDuration(currentTrack.durationSeconds)}</span>
          </div>
        </div>
      )}

      {/* Up Next / Live Queue List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Radio className="h-4 w-4 text-violet-400" />
              Authoritative Live Queue ({entries.length})
            </h3>
            {priorityCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {priorityCount} Priority
              </span>
            )}
            {freeCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                {freeCount} Free Line
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">
            Priority sorted & live synchronized
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl p-6 space-y-2">
            <Music className="h-8 w-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-medium text-zinc-300">Queue is currently empty</p>
            <p className="text-xs text-zinc-500">
              Be the first to submit a track to this live station!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const isPlaying = entry.status === "PLAYING";
              const isNext = entry.status === "NEXT";

              return (
                <div
                  key={entry.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 p-3.5 sm:p-4 rounded-lg border transition-all ${
                    isPlaying
                      ? "border-violet-500/70 bg-violet-950/20 shadow-sm"
                      : isNext
                        ? "border-amber-500/50 bg-amber-950/10"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70"
                  }`}
                >
                  {/* Left: Position & Track Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Position Number */}
                    <div
                      className={`h-7 w-7 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                        isPlaying
                          ? "bg-violet-600 text-white"
                          : isNext
                            ? "bg-amber-600/30 text-amber-300 border border-amber-500/30"
                            : "bg-zinc-800/80 text-zinc-300 border border-zinc-700"
                      }`}
                    >
                      #{index + 1}
                    </div>

                    {/* Track Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-100 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                          {entry.songName}
                        </span>

                        {/* Status Badges */}
                        {isPlaying && (
                          <Badge variant="success" className="text-[10px] uppercase font-bold py-0">
                            Playing
                          </Badge>
                        )}
                        {isNext && (
                          <Badge variant="warning" className="text-[10px] uppercase font-bold py-0">
                            Up Next
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        {entry.artistName ? (
                          <p className="text-xs text-zinc-400 truncate">
                            {entry.artistName}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-500 italic truncate">
                            Independent
                          </p>
                        )}
                        {entry.spotifyUrl && (
                          <a
                            href={entry.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954] text-[10px] font-semibold transition-colors shrink-0"
                            title={entry.artistName ? `Open ${entry.artistName} on Spotify` : "Open Spotify Profile"}
                          >
                            <SpotifyIcon className="h-2.5 w-2.5 text-[#1DB954]" />
                            <span>Spotify</span>
                            <ExternalLink className="h-2 w-2 opacity-70" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Tier Badge & Duration */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-zinc-800/50">
                    {/* Priority Rank & Tier Badge */}
                    {entry.isPriority ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded border ${getTierColorClass(
                          entry.colorSlot,
                          true,
                        )}`}
                      >
                        <Sparkles className="h-3 w-3" />
                        {entry.tierName || "Priority"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        Free Line
                      </span>
                    )}

                    {/* Duration */}
                    <div className="text-xs font-mono text-zinc-400 shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-500 sm:hidden" />
                      <span>{formatDuration(entry.durationSeconds)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
