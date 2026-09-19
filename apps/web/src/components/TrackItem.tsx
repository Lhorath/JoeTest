"use client";

import * as React from "react";
import { Badge, Button } from "@platform/ui";
import { Music, Play, Pause, Trash2, Clock, Activity, AlertTriangle, Globe, Lock, Loader2 } from "lucide-react";
import { TrackSummary } from "@platform/types";
import { api } from "../lib/api";

interface TrackItemProps {
  track: TrackSummary;
  onDeleted?: () => void;
  onUpdated?: (track: TrackSummary) => void;
  onSelect?: (track: TrackSummary) => void;
  isSelected?: boolean;
  activePlayingTrackId?: string | null;
  onPlayToggle?: (trackId: string | null) => void;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
  onDeleted,
  onUpdated,
  onSelect,
  isSelected,
  activePlayingTrackId,
  onPlayToggle,
}) => {
  const isPlaying = activePlayingTrackId === track.id;
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Pause if another track became active
  React.useEffect(() => {
    if (!isPlaying && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const handlePlayToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      audioRef.current?.pause();
      onPlayToggle?.(null);
      return;
    }

    try {
      if (!audioUrl) {
        setIsLoadingAudio(true);
        const { downloadUrl } = await api.tracks.download(track.id);
        setAudioUrl(downloadUrl);
        if (audioRef.current) {
          audioRef.current.src = downloadUrl;
          await audioRef.current.play();
          onPlayToggle?.(track.id);
        }
      } else if (audioRef.current) {
        await audioRef.current.play();
        onPlayToggle?.(track.id);
      }
    } catch (err) {
      console.error("Failed to load audio preview", err);
      onPlayToggle?.(null);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${track.songName}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.tracks.delete(track.id);
      onDeleted?.();
    } catch (err) {
      console.error("Failed to delete track", err);
      alert("Failed to delete track.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleVisibility = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTogglingVisibility(true);
    try {
      const newVisibility = !track.isPublic;
      const updated = await api.tracks.update(track.id, { isPublic: newVisibility });
      track.isPublic = newVisibility;
      onUpdated?.(updated);
    } catch (err) {
      console.error("Failed to toggle track visibility", err);
      alert("Failed to update track visibility.");
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const getProcessingBadge = () => {
    switch (track.processingState) {
      case "READY":
        return <Badge variant="success">Ready</Badge>;
      case "PROCESSING":
        return <Badge variant="warning">Processing</Badge>;
      case "FAILED":
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="info">{track.processingState}</Badge>;
    }
  };

  return (
    <div
      onClick={() => onSelect?.(track)}
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:p-4 rounded-lg border transition-all ${
        isSelected
          ? "border-violet-500 bg-violet-950/20"
          : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700"
      } ${onSelect ? "cursor-pointer" : ""}`}
    >
      <audio
        ref={audioRef}
        onEnded={() => onPlayToggle?.(null)}
        onPause={() => {
          if (activePlayingTrackId === track.id) {
            onPlayToggle?.(null);
          }
        }}
      />

      <div className="flex items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
        <button
          type="button"
          onClick={handlePlayToggle}
          disabled={track.processingState !== "READY" || isLoadingAudio}
          aria-label={isPlaying ? `Pause preview of ${track.songName}` : `Play preview of ${track.songName}`}
          className="h-11 w-11 shrink-0 rounded-full bg-zinc-800 hover:bg-violet-600 text-zinc-200 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-zinc-800 cursor-pointer min-h-[44px] min-w-[44px]"
        >
          {isLoadingAudio ? (
            <Activity className="h-4 w-4 animate-spin text-violet-400" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm text-zinc-100 truncate">
              {track.songName}
            </h4>
            {track.explicitContent && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                E
              </span>
            )}
            {getProcessingBadge()}
            {track.isPublic ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-950/60 text-emerald-400 rounded border border-emerald-800/60">
                <Globe className="h-2.5 w-2.5" /> Public
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-zinc-800 text-zinc-400 rounded border border-zinc-700">
                <Lock className="h-2.5 w-2.5" /> Private
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 text-xs text-zinc-400 mt-1 flex-wrap">
            <span className="text-zinc-300 font-medium">
              {track.artistIdentity?.artistName || "Unknown Artist"}
            </span>
            {track.albumName && <span>• {track.albumName}</span>}
            {track.bpm && <span>• {track.bpm} BPM</span>}
            {track.musicalKey && <span>• Key {track.musicalKey}</span>}
            <span className="flex items-center gap-1 text-zinc-500">
              <Clock className="h-3 w-3" />
              {formatDuration(track.durationSeconds)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 sm:mt-0 self-end sm:self-center shrink-0">
        {onSelect && (
          <Button
            type="button"
            variant={isSelected ? "primary" : "outline"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(track);
            }}
            className="min-h-[40px]"
          >
            {isSelected ? "Selected" : "Select"}
          </Button>
        )}

        <button
          type="button"
          onClick={handleToggleVisibility}
          disabled={isTogglingVisibility}
          aria-label={track.isPublic ? "Make track private" : "Make track public"}
          className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          title={track.isPublic ? "Public on your creator profile. Click to make private." : "Private (only visible to you). Click to make public on your profile."}
        >
          {isTogglingVisibility ? (
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
          ) : track.isPublic ? (
            <Globe className="h-4 w-4 text-emerald-400" />
          ) : (
            <Lock className="h-4 w-4 text-zinc-400" />
          )}
        </button>

        {onDeleted && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`Delete ${track.songName}`}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Delete Track"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
