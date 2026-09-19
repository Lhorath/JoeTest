"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { PublicQueueEntry, PublicLiveSessionDetail } from "@platform/types";
import { Button, Card, Badge } from "@platform/ui";
import { useLiveSocket } from "@/hooks/useLiveSocket";
import {
  Play,
  CheckCircle,
  SkipForward,
  Music,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Volume2,
  AlertCircle,
  ArrowUpRight,
  Radio,
  XCircle,
} from "lucide-react";

export function SpotifyIcon({ className = "h-3 w-3" }: { className?: string }) {
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

interface HostQueueManagerProps {
  sessionId: string;
  onSessionUpdated?: () => void;
}

export function HostQueueManager({
  sessionId,
  onSessionUpdated,
}: HostQueueManagerProps) {
  const [session, setSession] = React.useState<PublicLiveSessionDetail | null>(null);
  const [queue, setQueue] = React.useState<PublicQueueEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const loadQueueData = React.useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [sessData, queueData] = await Promise.all([
          api.liveSessions.getPublicById(sessionId),
          api.liveSessions.getPublicQueue(sessionId),
        ]);
        setSession(sessData);
        setQueue(queueData || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load live session queue");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId],
  );

  // Real-time synchronization with conflict handling and reconciliation
  const { isConnected } = useLiveSocket(sessionId, {
    onReconcile: () => {
      loadQueueData(true);
      if (onSessionUpdated) onSessionUpdated();
    },
  });

  React.useEffect(() => {
    loadQueueData();
  }, [loadQueueData]);

  // Handle conflicts (409) gracefully with auto-reconcile
  const handleApiError = async (err: any, fallbackMessage: string) => {
    if (err?.status === 409 || err?.message?.includes("Stale queue revision") || err?.code === "CONFLICT") {
      setNotice("Queue was modified concurrently. Refreshed to latest state.");
      setTimeout(() => setNotice(null), 4000);
      await loadQueueData(true);
      if (onSessionUpdated) onSessionUpdated();
    } else {
      setError(err?.message || fallbackMessage);
    }
  };

  // 1. Play Next
  const handlePlayNext = async () => {
    setActionId("play-next");
    setError(null);
    try {
      await api.liveSessions.playNext(sessionId, session?.queueRevision);
      await loadQueueData(true);
      if (onSessionUpdated) onSessionUpdated();
    } catch (err: any) {
      await handleApiError(err, "Failed to play next track");
    } finally {
      setActionId(null);
    }
  };

  // 2. Load Entry directly into Studio Player
  const handleLoadEntry = async (entryId: string) => {
    setActionId(`load-${entryId}`);
    setError(null);
    try {
      await api.liveSessions.loadQueueEntry(
        sessionId,
        entryId,
        session?.queueRevision,
      );
      await loadQueueData(true);
      if (onSessionUpdated) onSessionUpdated();
    } catch (err: any) {
      await handleApiError(err, "Failed to load track into player");
    } finally {
      setActionId(null);
    }
  };

  // 3. Move Entry to Next Up
  const handleMoveToNext = async (entryId: string) => {
    setActionId(`move-${entryId}`);
    setError(null);
    try {
      await api.liveSessions.moveToNext(
        sessionId,
        entryId,
        session?.queueRevision,
      );
      await loadQueueData(true);
      if (onSessionUpdated) onSessionUpdated();
    } catch (err: any) {
      await handleApiError(err, "Failed to set track as Next Up");
    } finally {
      setActionId(null);
    }
  };

  // 4. Clear Now Playing (restores track to queue without fake completion)
  const handleClearPlayer = async () => {
    setActionId("clear-player");
    setError(null);
    try {
      await api.liveSessions.clearPlayer(
        sessionId,
        session?.queueRevision,
      );
      await loadQueueData(true);
      if (onSessionUpdated) onSessionUpdated();
    } catch (err: any) {
      await handleApiError(err, "Failed to clear active player");
    } finally {
      setActionId(null);
    }
  };

  // 5. Complete Queue Entry (or active track)
  const handleCompleteEntry = async (entryId: string) => {
    setActionId(`complete-${entryId}`);
    setError(null);
    try {
      await api.liveSessions.completeQueueEntry(
        sessionId,
        entryId,
        session?.queueRevision,
      );
      await loadQueueData(true);
      if (onSessionUpdated) onSessionUpdated();
    } catch (err: any) {
      await handleApiError(err, "Failed to complete track");
    } finally {
      setActionId(null);
    }
  };

  // 6. Skip Queue Entry
  const handleSkipEntry = async (entryId: string) => {
    setActionId(`skip-${entryId}`);
    setError(null);
    try {
      await api.liveSessions.skipQueueEntry(
        sessionId,
        entryId,
        session?.queueRevision,
      );
      await loadQueueData(true);
      if (onSessionUpdated) onSessionUpdated();
    } catch (err: any) {
      await handleApiError(err, "Failed to skip track");
    } finally {
      setActionId(null);
    }
  };

  // 7. Remove Queue Entry completely
  const handleRemoveEntry = async (entryId: string) => {
    setActionId(`remove-${entryId}`);
    setError(null);
    try {
      await api.liveSessions.removeQueueEntry(
        sessionId,
        entryId,
        session?.queueRevision,
      );
      await loadQueueData(true);
      if (onSessionUpdated) onSessionUpdated();
    } catch (err: any) {
      await handleApiError(err, "Failed to remove track from queue");
    } finally {
      setActionId(null);
    }
  };

  // 8. Toggle Submissions
  const handleToggleSubmissions = async () => {
    if (!session) return;
    setIsUpdating(true);
    setError(null);
    try {
      await api.liveSessions.updateConfiguration(sessionId, {
        submissionsOpen: !session.submissionsOpen,
      });
      await loadQueueData(true);
      if (onSessionUpdated) onSessionUpdated();
    } catch (err: any) {
      await handleApiError(err, "Failed to update submissions setting");
    } finally {
      setIsUpdating(false);
    }
  };

  const priorityEntries = queue.filter((e) => e.isPriority);
  const standardEntries = queue.filter((e) => !e.isPriority);

  if (isLoading) {
    return (
      <Card className="border-zinc-800 p-8 text-center space-y-3 bg-zinc-900/40">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400 mx-auto" />
        <p className="text-xs text-zinc-400">Loading live broadcast queue...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div className="flex items-center gap-2 p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-amber-200 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue Quick Controls Bar */}
      <Card className="border-zinc-800 bg-zinc-900/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant={session?.submissionsOpen ? "success" : "warning"}
            className="text-xs font-bold"
          >
            {session?.submissionsOpen ? "Submissions Open" : "Submissions Paused"}
          </Badge>

          <span className="text-xs text-zinc-400">
            Waiting: <strong className="text-zinc-200">{queue.length}</strong> tracks
            {priorityEntries.length > 0 && (
              <span className="ml-1 text-amber-400 font-semibold">
                ({priorityEntries.length} priority)
              </span>
            )}
          </span>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span>{isConnected ? "Live Synced" : "Reconnecting"}</span>
            <span className="text-zinc-600">• Rev #{session?.queueRevision ?? 1}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePlayNext}
            disabled={actionId === "play-next" || queue.length === 0}
            className="gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white"
            title="Pulls the next priority/queued track into the Studio Player"
          >
            {actionId === "play-next" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            Play Next Track
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleSubmissions}
            disabled={isUpdating}
            className="text-xs"
          >
            {session?.submissionsOpen ? "Pause Submissions" : "Resume Submissions"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => loadQueueData(true)}
            className="h-8 px-2"
            title="Refresh queue"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>

      {/* Now Playing Active Player Banner */}
      {session?.currentTrack ? (
        <Card className="border-violet-500/50 bg-gradient-to-r from-violet-950/60 via-zinc-900 to-zinc-950 p-4 shadow-lg shadow-violet-950/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-violet-600/30 border border-violet-500/30 text-violet-300 flex items-center justify-center shrink-0">
                <Radio className="h-5 w-5 text-violet-400 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 bg-violet-950/80 border border-violet-800/40 px-2 py-0.5 rounded">
                    Now Playing In Studio
                  </span>
                </div>
                <h4 className="text-base font-bold text-zinc-100 truncate mt-0.5">
                  {session.currentTrack.songName}
                </h4>
                <p className="text-xs text-zinc-400 truncate">
                  By {session.currentTrack.artistName || "Independent Artist"} • Submitted by{" "}
                  <span className="text-zinc-200 font-medium">
                    {session.currentTrack.submitterName}
                  </span>
                </p>
              </div>
            </div>

            {/* Active Track Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {session.currentTrack.audioUrl && (
                <a
                  href={session.currentTrack.audioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Music className="h-3.5 w-3.5 text-violet-400" /> Audio Stream
                </a>
              )}

              {session.currentTrack.spotifyUrl && (
                <a
                  href={session.currentTrack.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <SpotifyIcon className="h-3.5 w-3.5" /> Spotify
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              )}

              {/* Mark Complete */}
              {session.currentQueueEntryId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={actionId === `complete-${session.currentQueueEntryId}`}
                  onClick={() => handleCompleteEntry(session.currentQueueEntryId!)}
                  className="gap-1 text-xs text-emerald-400 border-emerald-800/50 hover:bg-emerald-950/40 hover:text-emerald-300"
                  title="Mark review as completed and archive to history"
                >
                  {actionId === `complete-${session.currentQueueEntryId}` ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3 w-3" />
                  )}
                  Complete
                </Button>
              )}

              {/* Skip Track */}
              {session.currentQueueEntryId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={actionId === `skip-${session.currentQueueEntryId}`}
                  onClick={() => handleSkipEntry(session.currentQueueEntryId!)}
                  className="gap-1 text-xs text-zinc-400 hover:text-amber-400 hover:bg-amber-950/30"
                  title="Skip track and move to skipped list"
                >
                  {actionId === `skip-${session.currentQueueEntryId}` ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <SkipForward className="h-3 w-3" />
                  )}
                  Skip
                </Button>
              )}

              {/* Clear Player (Eject to Queue) */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={actionId === "clear-player"}
                onClick={handleClearPlayer}
                className="gap-1 text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30"
                title="Clears Studio Player and returns track to queue without marking completed"
              >
                {actionId === "clear-player" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                Clear Player
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-zinc-400">
          <div className="flex items-center gap-2.5">
            <Volume2 className="h-4 w-4 text-zinc-500" />
            <span className="text-xs">
              No track currently loaded in Studio Player. Choose a track below or click <strong>Play Next Track</strong>.
            </span>
          </div>
          {queue.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePlayNext}
              disabled={actionId === "play-next"}
              className="gap-1 text-xs text-violet-400 hover:text-violet-300 border-violet-800/40 shrink-0"
            >
              <Play className="h-3 w-3 fill-current" /> Start Next Track
            </Button>
          )}
        </Card>
      )}

      {/* Live Queue Items List */}
      {queue.length === 0 ? (
        <Card className="border-dashed border-zinc-800 p-8 text-center space-y-2 bg-zinc-900/20">
          <Music className="h-6 w-6 text-zinc-600 mx-auto" />
          <p className="text-xs font-semibold text-zinc-300">
            Queue is currently empty
          </p>
          <p className="text-[11px] text-zinc-500">
            Share your station vanity link with viewers so artists can submit their tracks.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {queue.map((entry, index) => {
            const isNextUp = entry.status === "NEXT";
            return (
              <Card
                key={entry.id}
                className={`border p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-colors ${
                  isNextUp
                    ? "border-violet-600/70 bg-violet-950/20"
                    : entry.isPriority
                    ? "border-amber-800/40 bg-amber-950/10"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      isNextUp
                        ? "bg-violet-800/60 text-violet-200"
                        : entry.isPriority
                        ? "bg-amber-900/50 text-amber-200"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    #{index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-100 truncate">
                        {entry.songName}
                      </span>

                      {isNextUp && (
                        <Badge
                          variant="info"
                          className="text-[9px] font-bold bg-violet-950/80 text-violet-300 border-violet-700/50"
                        >
                          NEXT UP
                        </Badge>
                      )}

                      {entry.isPriority && (
                        <Badge variant="warning" className="text-[9px] font-bold">
                          {entry.tierName || "Priority"} (Rank #{entry.priorityRank})
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {entry.artistName ? (
                        <p className="text-xs text-zinc-400">
                          Artist: {entry.artistName}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">
                          Independent
                        </p>
                      )}

                      {entry.submitterName && (
                        <span className="text-xs text-zinc-500">
                          • by {entry.submitterName}
                        </span>
                      )}

                      {entry.spotifyUrl && (
                        <a
                          href={entry.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954] text-[10px] font-semibold transition-colors shrink-0"
                          title={entry.artistName ? `Open ${entry.artistName} on Spotify` : "Open Spotify"}
                        >
                          <SpotifyIcon className="h-2.5 w-2.5 text-[#1DB954]" />
                          <span>Spotify</span>
                          <ExternalLink className="h-2 w-2 opacity-70" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Host Actions for this Queue Item */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {/* Play / Load into Studio */}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={actionId === `load-${entry.id}`}
                    onClick={() => handleLoadEntry(entry.id)}
                    className="gap-1 text-xs bg-violet-600 hover:bg-violet-500 text-white h-7 px-2.5"
                    title="Load immediately into the Studio Player"
                  >
                    {actionId === `load-${entry.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3 fill-current" />
                    )}
                    Play Now
                  </Button>

                  {/* Move to Next Up */}
                  {!isNextUp && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actionId === `move-${entry.id}`}
                      onClick={() => handleMoveToNext(entry.id)}
                      className="gap-1 text-xs text-violet-300 border-violet-800/40 hover:bg-violet-950/30 h-7 px-2"
                      title="Set as the Next Up track on stream"
                    >
                      {actionId === `move-${entry.id}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      Next Up
                    </Button>
                  )}

                  {/* Mark Completed */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actionId === `complete-${entry.id}`}
                    onClick={() => handleCompleteEntry(entry.id)}
                    className="gap-1 text-xs text-emerald-400 border-emerald-800/40 hover:bg-emerald-950/30 h-7 px-2"
                    title="Mark reviewed and archive"
                  >
                    {actionId === `complete-${entry.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    Done
                  </Button>

                  {/* Skip */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={actionId === `skip-${entry.id}`}
                    onClick={() => handleSkipEntry(entry.id)}
                    className="gap-1 text-xs text-zinc-400 hover:text-amber-400 hover:bg-amber-950/30 h-7 px-2"
                    title="Skip track"
                  >
                    {actionId === `skip-${entry.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <SkipForward className="h-3 w-3" />
                    )}
                    Skip
                  </Button>

                  {/* Remove */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={actionId === `remove-${entry.id}`}
                    onClick={() => handleRemoveEntry(entry.id)}
                    className="text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 h-7 px-1.5"
                    title="Remove from queue"
                  >
                    {actionId === `remove-${entry.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
