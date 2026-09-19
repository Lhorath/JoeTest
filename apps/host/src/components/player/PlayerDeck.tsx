"use client";

import * as React from "react";
import {
  Play,
  Pause,
  SkipForward,
  XCircle,
  Volume2,
  VolumeX,
  Disc3,
  ExternalLink,
  Music,
  Radio,
  FileAudio,
} from "lucide-react";
import { Button, TierBadge, ProgressBar } from "@platform/ui";
import { useHostLiveSession } from "../../providers/HostLiveSessionProvider";
import { TwoMinuteCountdown } from "./TwoMinuteCountdown";

export const PlayerDeck: React.FC = () => {
  const {
    currentPlayingEntry,
    currentTrack,
    activeAudioUrl,
    playNext,
    clearPlayer,
    isReconciling,
    liveSession,
  } = useHostLiveSession();

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [currentTime, setCurrentTime] = React.useState<number>(0);
  const [duration, setDuration] = React.useState<number>(0);
  const [volume, setVolume] = React.useState<number>(0.8);
  const [isMuted, setIsMuted] = React.useState<boolean>(false);
  const [isActionPending, setIsActionPending] = React.useState<boolean>(false);

  // Sync audio element volume
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle URL change
  React.useEffect(() => {
    if (audioRef.current) {
      if (activeAudioUrl) {
        audioRef.current.src = activeAudioUrl;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
        audioRef.current.src = "";
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
    }
  }, [activeAudioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = newRatio * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePlayNext = async () => {
    try {
      setIsActionPending(true);
      await playNext();
    } finally {
      setIsActionPending(false);
    }
  };

  const handleClearPlayer = async () => {
    try {
      setIsActionPending(true);
      await clearPlayer();
    } finally {
      setIsActionPending(false);
    }
  };

  const formatSeconds = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const hasLoadedEntry = !!currentPlayingEntry;
  const songName =
    currentTrack?.songName ||
    currentPlayingEntry?.submission?.songName ||
    "Unknown Track";
  const artistName =
    currentTrack?.artistName ||
    currentPlayingEntry?.submission?.artistName ||
    "Unknown Artist";
  const isPriority = !!currentPlayingEntry?.submission?.isPriority;
  const externalUrl =
    currentTrack?.externalSources?.[0]?.externalUrl ||
    currentPlayingEntry?.submission?.externalUrl;

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6">
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top Header Deck Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              hasLoadedEntry
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : "bg-zinc-900 text-zinc-600 border border-zinc-800"
            }`}
          >
            <Disc3
              className={`h-6 w-6 ${hasLoadedEntry && isPlaying ? "animate-spin" : ""}`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                MASTER DECK A
              </span>
              {hasLoadedEntry ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LOADED & ARMED
                </span>
              ) : (
                <span className="text-[11px] font-medium text-zinc-500">
                  STANDBY
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Revision #{liveSession?.queueRevision ?? 0}
            </p>
          </div>
        </div>

        {/* 2-Min Qualification Countdown & Rules */}
        {hasLoadedEntry && (
          <TwoMinuteCountdown
            loadedAt={currentPlayingEntry?.loadedIntoPlayerAt}
          />
        )}
      </div>

      {/* Main Deck Center */}
      {hasLoadedEntry ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Track Identity & Artwork (5 cols) */}
          <div className="lg:col-span-5 flex items-center gap-4">
            <div className="relative h-20 w-20 flex-shrink-0 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-inner group">
              {currentTrack?.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentTrack.artworkUrl}
                  alt={songName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Music className="h-8 w-8 text-zinc-600 group-hover:text-amber-500 transition-colors" />
              )}
            </div>
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <TierBadge isPriority={isPriority} />
                {externalUrl && (
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"
                  >
                    <ExternalLink className="h-3 w-3" /> External Link
                  </a>
                )}
              </div>
              <h2 className="text-xl font-black tracking-tight text-zinc-100 truncate">
                {songName}
              </h2>
              <p className="text-sm font-medium text-zinc-400 truncate">
                {artistName}
              </p>
            </div>
          </div>

          {/* Player Transport Controls & Scrubber (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Scrubber Bar */}
            <div className="space-y-1.5">
              <div
                onClick={handleSeek}
                className="cursor-pointer group py-1"
                role="progressbar"
                aria-valuenow={currentTime}
                aria-valuemax={duration}
              >
                <ProgressBar
                  value={currentTime}
                  max={duration || 100}
                  className="h-3 group-hover:h-3.5 transition-all"
                  barClassName="bg-gradient-to-r from-amber-500 to-amber-400"
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>{formatSeconds(currentTime)}</span>
                <span>
                  {duration > 0 ? formatSeconds(duration) : "--:--"}
                </span>
              </div>
            </div>

            {/* Transport Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Play / Pause / Audio Controls */}
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={togglePlay}
                  disabled={!activeAudioUrl}
                  className="bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-zinc-950 font-bold px-5"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="mr-1.5 h-4 w-4 fill-current" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-1.5 h-4 w-4 fill-current" /> Play
                    </>
                  )}
                </Button>

                {/* Volume Slider */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/50">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4 text-red-400" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-20 accent-amber-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
                  />
                  <span className="text-[11px] font-mono text-zinc-400 w-7">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              </div>

              {/* Deck Advance & Clear Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearPlayer}
                  isLoading={isActionPending}
                  className="border-zinc-700 hover:bg-red-950/30 hover:border-red-500/50 hover:text-red-300"
                >
                  <XCircle className="mr-1.5 h-4 w-4" /> Clear Deck
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handlePlayNext}
                  isLoading={isActionPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  <SkipForward className="mr-1.5 h-4 w-4" /> Play Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Deck State */
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-6 px-4 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-zinc-900 text-zinc-600 border border-zinc-800">
              <FileAudio className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-200">
                Deck is Currently Idle
              </h3>
              <p className="text-xs text-zinc-400 max-w-md">
                Load any track from the queue below or advance directly to the
                next highest priority submission.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handlePlayNext}
            isLoading={isActionPending || isReconciling}
            className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-6 shadow-xl shadow-amber-600/20 w-full sm:w-auto"
          >
            <Play className="mr-2 h-5 w-5 fill-current" />
            Start Playing Next
          </Button>
        </div>
      )}
    </div>
  );
};
