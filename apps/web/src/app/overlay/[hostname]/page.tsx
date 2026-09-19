"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Music, Radio, Disc, Volume2, Sparkles, AlertCircle } from "lucide-react";

interface OverlayData {
  stationName: string;
  hostname: string;
  isLive: boolean;
  nowPlaying: {
    id: string;
    songName: string;
    artistName: string;
    spotifyUrl?: string | null;
    durationSeconds: number;
    tierName?: string | null;
    colorSlot?: string | null;
    isPriority?: boolean;
  } | null;
  theme: {
    style: string;
    accentColor: string;
  };
}

export default function StationOverlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const hostname = (params?.hostname as string)?.toLowerCase().trim();
  const aspect = searchParams.get("aspect") || "16:9"; // "16:9" or "1:1"
  const style = searchParams.get("style") || "modern"; // "modern" | "compact" | "neon" | "minimal"

  const [overlayData, setOverlayData] = React.useState<OverlayData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Poll authoritative realtime state every 2.5 seconds
  React.useEffect(() => {
    if (!hostname) return;

    let isMounted = true;

    const fetchOverlay = () => {
      api.overlays
        .getByStation(hostname)
        .then((data: any) => {
          if (isMounted) {
            setOverlayData(data);
            setError(null);
          }
        })
        .catch((err: any) => {
          if (isMounted) {
            setError(err?.response?.data?.message || "Station not found");
          }
        });
    };

    fetchOverlay();
    const interval = setInterval(fetchOverlay, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [hostname]);

  if (error) {
    return (
      <div className="min-h-screen bg-transparent p-6 flex items-center justify-center font-sans">
        <div className="bg-black/90 text-red-400 border border-red-800/80 rounded-xl p-4 flex items-center gap-3 shadow-2xl backdrop-blur-md">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Overlay Error</p>
            <p className="text-sm text-zinc-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!overlayData) {
    return null; // Keep transparent while initial load
  }

  const isSquare = aspect === "1:1";
  const nowPlaying = overlayData.nowPlaying;

  // 1:1 Square Widget
  if (isSquare) {
    return (
      <div className="min-h-screen bg-transparent p-4 flex items-start justify-start font-sans">
        <div className="w-80 h-80 bg-zinc-950/95 border-2 border-violet-500/40 rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between text-zinc-100 overflow-hidden relative">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-600/30 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                {overlayData.stationName}
              </span>
            </div>
            {nowPlaying?.isPriority && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> VIP
              </span>
            )}
          </div>

          {/* Body: Now Playing vs NO_TRACK_LOADED */}
          {nowPlaying ? (
            <div className="my-auto space-y-2 z-10">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-600/30 mb-3">
                <Disc className="h-8 w-8 text-white animate-[spin_8s_linear_infinite]" />
              </div>
              <p className="text-lg font-black tracking-tight text-white line-clamp-2 leading-tight">
                {nowPlaying.songName}
              </p>
              <p className="text-xs font-semibold text-violet-300 truncate">
                {nowPlaying.artistName}
              </p>
            </div>
          ) : (
            <div className="my-auto text-center space-y-2 py-4 z-10">
              <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <Radio className="h-6 w-6" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                NO_TRACK_LOADED
              </p>
              <p className="text-[11px] text-zinc-500">Awaiting host queue selection</p>
            </div>
          )}

          {/* Footer Audio Bars */}
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3 z-10">
            <div className="flex items-end gap-1 h-4">
              <span className="w-1 bg-violet-500 rounded-full animate-[bounce_0.8s_infinite]" />
              <span className="w-1 bg-violet-400 rounded-full animate-[bounce_1.1s_infinite_0.2s]" />
              <span className="w-1 bg-violet-500 rounded-full animate-[bounce_0.9s_infinite_0.4s]" />
              <span className="w-1 bg-violet-300 rounded-full animate-[bounce_1.3s_infinite_0.1s]" />
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              {nowPlaying ? "NOW PLAYING" : "IDLE"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default: 16:9 Lower Third / Banner Bar
  return (
    <div className="min-h-screen bg-transparent p-6 flex flex-col justify-end items-start font-sans">
      <div
        className={`max-w-2xl w-full rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 overflow-hidden relative ${
          style === "neon"
            ? "bg-black/95 border-violet-500 shadow-violet-500/20"
            : style === "compact"
              ? "bg-zinc-950/90 border-zinc-800 p-3"
              : "bg-zinc-950/95 border-zinc-800/80 p-4"
        }`}
      >
        {/* Glow Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-500 to-fuchsia-500" />

        {nowPlaying ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Spinning Disc or Vinyl artwork placeholder */}
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-lg shadow-violet-600/30">
                <Disc className="h-7 w-7 text-white animate-[spin_10s_linear_infinite]" />
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-violet-950/80 border border-violet-800/60 text-violet-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Volume2 className="h-3 w-3" /> NOW PLAYING
                  </span>
                  {nowPlaying.tierName && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/60 text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> {nowPlaying.tierName}
                    </span>
                  )}
                </div>

                <p className="text-base font-black text-white truncate tracking-tight">
                  {nowPlaying.songName}
                </p>
                <p className="text-xs font-semibold text-zinc-300 truncate">
                  {nowPlaying.artistName}
                </p>
              </div>
            </div>

            {/* Station Branding & Animated Equalizer */}
            <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-0.5 h-3.5">
                  <span className="w-1 bg-violet-400 rounded-full animate-[bounce_0.8s_infinite]" />
                  <span className="w-1 bg-violet-300 rounded-full animate-[bounce_1.2s_infinite_0.2s]" />
                  <span className="w-1 bg-violet-500 rounded-full animate-[bounce_0.9s_infinite_0.4s]" />
                  <span className="w-1 bg-indigo-400 rounded-full animate-[bounce_1.4s_infinite_0.1s]" />
                  <span className="w-1 bg-fuchsia-400 rounded-full animate-[bounce_0.7s_infinite_0.3s]" />
                </div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {overlayData.stationName}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Live Feedback Session</span>
            </div>
          </div>
        ) : (
          /* NO_TRACK_LOADED State */
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  NO_TRACK_LOADED
                </p>
                <p className="text-[11px] text-zinc-400">
                  {overlayData.isLive
                    ? "Station is Live — Select a track from queue to broadcast"
                    : "Station is currently Offline"}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-zinc-300">{overlayData.stationName}</p>
              <p className="text-[10px] text-zinc-500 font-mono uppercase">Live Audio Stream</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
