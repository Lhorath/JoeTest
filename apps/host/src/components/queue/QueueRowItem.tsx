"use client";

import * as React from "react";
import {
  Play,
  ArrowUpCircle,
  Sparkles,
  ExternalLink,
  Music,
  GripVertical,
  Clock,
} from "lucide-react";
import { Button, TierBadge, Badge } from "@platform/ui";
import { LiveQueueEntry } from "../../providers/HostLiveSessionProvider";
import { QueueStatus } from "@platform/types";

export interface QueueRowItemProps {
  entry: LiveQueueEntry;
  index: number;
  onLoad: (entryId: string) => Promise<void>;
  onMoveToNext: (entryId: string) => Promise<void>;
  onChangeTier: (entry: LiveQueueEntry) => void;
  onDragStart?: (e: React.DragEvent, entry: LiveQueueEntry) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetEntry: LiveQueueEntry) => void;
}

export const QueueRowItem: React.FC<QueueRowItemProps> = ({
  entry,
  index,
  onLoad,
  onMoveToNext,
  onChangeTier,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [isActionPending, setIsActionPending] = React.useState(false);

  const isPlaying = entry.status === QueueStatus.PLAYING;
  const isPriority = entry.submission.isPriority;
  const songName = entry.submission.songName || "Untitled Submission";
  const artistName = entry.submission.artistName || "Unknown Artist";
  const externalUrl = entry.submission.externalUrl;
  const durationSecs = entry.submission.durationSeconds;

  const formatDuration = (secs?: number) => {
    if (!secs || secs <= 0) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleLoad = async () => {
    try {
      setIsActionPending(true);
      await onLoad(entry.id);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleMoveToNext = async () => {
    try {
      setIsActionPending(true);
      await onMoveToNext(entry.id);
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, entry)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, entry)}
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg border transition-all duration-150 ${
        isPlaying
          ? "border-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/5"
          : "border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-zinc-700"
      }`}
    >
      {/* Left: Sequence + Drag Handle + Artwork + Metadata */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Drag Intent Handle */}
        <button
          type="button"
          title="Drag to bump entry (move-to-next intent)"
          className="cursor-grab text-zinc-600 group-hover:text-zinc-400 active:cursor-grabbing p-1 -ml-1 rounded hover:bg-zinc-800 transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Index sequence badge */}
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-zinc-800/80 text-xs font-mono font-bold text-zinc-400">
          {index + 1}
        </span>

        {/* Artwork / Icon */}
        <div className="relative h-10 w-10 flex-shrink-0 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
          {entry.submission.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.submission.artworkUrl}
              alt={songName}
              className="h-full w-full object-cover"
            />
          ) : (
            <Music className="h-4 w-4 text-zinc-500" />
          )}
        </div>

        {/* Song and Artist */}
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-100 truncate">
              {songName}
            </span>
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
                title="Open stream link"
                className="text-zinc-500 hover:text-blue-400 transition-colors flex-shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="text-xs text-zinc-400 truncate">{artistName}</p>
        </div>
      </div>

      {/* Center/Right: Tier, Duration, Status, and Controls */}
      <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap sm:flex-nowrap border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/60">
        {/* Tier Indicator */}
        <TierBadge isPriority={isPriority} />

        {/* Duration */}
        <div className="flex items-center gap-1 text-xs font-mono text-zinc-500">
          <Clock className="h-3 w-3" />
          <span>{formatDuration(durationSecs)}</span>
        </div>

        {/* Status indicator */}
        {isPlaying ? (
          <Badge variant="warning" className="text-[10px] uppercase font-bold">
            Playing
          </Badge>
        ) : index === 0 ? (
          <Badge variant="info" className="text-[10px] uppercase font-bold">
            Up Next
          </Badge>
        ) : (
          <span className="text-[11px] font-mono text-zinc-500">Queued</span>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 ml-1">
          {/* Direct Load */}
          {!isPlaying && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoad}
              isLoading={isActionPending}
              title="Load into Master Deck immediately"
              className="h-8 px-2.5 text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:text-amber-400"
            >
              <Play className="h-3.5 w-3.5 fill-current mr-1 text-amber-500" />
              Load
            </Button>
          )}

          {/* Move To Next (Bump to Top) */}
          {!isPlaying && index !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMoveToNext}
              isLoading={isActionPending}
              title="Move to top of tier (Next in line)"
              className="h-8 px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <ArrowUpCircle className="h-4 w-4" />
            </Button>
          )}

          {/* Change Tier */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChangeTier(entry)}
            title="Promote / Demote Tier"
            className="h-8 px-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
