"use client";

import * as React from "react";
import {
  ListMusic,
  Filter,
  Sparkles,
  Layers,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button, Badge, LoadingState } from "@platform/ui";
import {
  useHostLiveSession,
  LiveQueueEntry,
} from "../../providers/HostLiveSessionProvider";
import { QueueRowItem } from "./QueueRowItem";
import { TierChangeModal } from "./TierChangeModal";

export const LiveQueueTable: React.FC = () => {
  const {
    queue,
    loadQueueEntry,
    moveToNext,
    changeEntryTier,
    refreshAuthoritativeState,
    isReconciling,
    conflictNotice,
    clearConflictNotice,
  } = useHostLiveSession();

  const [activeFilter, setActiveFilter] = React.useState<
    "ALL" | "PRIORITY" | "FREE"
  >("ALL");
  const [selectedTierChangeEntry, setSelectedTierChangeEntry] =
    React.useState<LiveQueueEntry | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [draggedEntry, setDraggedEntry] = React.useState<LiveQueueEntry | null>(
    null,
  );

  // Filter items
  const filteredQueue = React.useMemo(() => {
    return queue.filter((entry) => {
      if (activeFilter === "PRIORITY") return entry.submission.isPriority;
      if (activeFilter === "FREE") return !entry.submission.isPriority;
      return true;
    });
  }, [queue, activeFilter]);

  const priorityCount = queue.filter((e) => e.submission.isPriority).length;
  const freeCount = queue.filter((e) => !e.submission.isPriority).length;

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(
        `${window.location.origin}/submissions/live`,
      );
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Drag and Drop: determine intent and call backend API
  const handleDragStart = (e: React.DragEvent, entry: LiveQueueEntry) => {
    setDraggedEntry(entry);
    e.dataTransfer.setData("text/plain", entry.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetEntry: LiveQueueEntry,
  ) => {
    e.preventDefault();
    if (!draggedEntry || draggedEntry.id === targetEntry.id) {
      setDraggedEntry(null);
      return;
    }

    // User intent: If dropped near or above target, interpret intent as bumping to next
    await moveToNext(draggedEntry.id);
    setDraggedEntry(null);
  };

  return (
    <div className="space-y-4">
      {/* 409 Conflict Banner */}
      {conflictNotice && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span>{conflictNotice}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearConflictNotice}
            className="h-6 px-2 text-[11px] text-amber-400 hover:text-amber-200"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Control Bar: Filters, Counts, and Re-sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-amber-500 border border-zinc-800">
            <ListMusic className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-100">Live Queue</h3>
              <Badge variant="secondary" className="font-mono text-xs">
                {queue.length} Active
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Drag rows or use actions as a move-to-next intent gesture.
            </p>
          </div>
        </div>

        {/* Filter Pills & Manual Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeFilter === "ALL"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All ({queue.length})
            </button>
            <button
              onClick={() => setActiveFilter("PRIORITY")}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeFilter === "PRIORITY"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-zinc-400 hover:text-amber-400"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              Priority ({priorityCount})
            </button>
            <button
              onClick={() => setActiveFilter("FREE")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeFilter === "FREE"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Free Line ({freeCount})
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshAuthoritativeState()}
            isLoading={isReconciling}
            title="Refresh queue from server"
            className="h-8 px-2.5 border-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isReconciling ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Queue List Container */}
      <div className="space-y-2">
        {filteredQueue.length > 0 ? (
          filteredQueue.map((entry, index) => (
            <QueueRowItem
              key={entry.id}
              entry={entry}
              index={index}
              onLoad={loadQueueEntry}
              onMoveToNext={moveToNext}
              onChangeTier={(e) => setSelectedTierChangeEntry(e)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/40 space-y-4">
            <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 border border-zinc-800">
              <Layers className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-zinc-200">
                {activeFilter === "ALL"
                  ? "No Tracks in Active Queue"
                  : `No ${activeFilter === "PRIORITY" ? "Priority" : "Free"} Tracks Found`}
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm">
                Share your public submission link with listeners on stream to
                start receiving live tracks.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="border-zinc-700 hover:bg-zinc-900 text-zinc-300"
            >
              {copiedLink ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-green-400" /> Copied
                  to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Public Submission
                  Link
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Tier Change Modal */}
      <TierChangeModal
        isOpen={!!selectedTierChangeEntry}
        onClose={() => setSelectedTierChangeEntry(null)}
        entry={selectedTierChangeEntry}
        onConfirm={async (dest, tierId) => {
          if (selectedTierChangeEntry) {
            await changeEntryTier(selectedTierChangeEntry.id, dest, tierId);
          }
        }}
      />
    </div>
  );
};
