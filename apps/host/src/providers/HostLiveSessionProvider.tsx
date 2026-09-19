"use client";

import * as React from "react";
import { createApiClient } from "@platform/api-client";
import { useLiveSocket } from "../hooks/useLiveSocket";
import { LiveSessionStatus, QueueStatus } from "@platform/types";

export interface TrackSnapshot {
  id: string;
  songName?: string;
  artistName?: string;
  artworkUrl?: string;
  audioUrl?: string;
  externalSources?: Array<{ externalUrl?: string; platform?: string }>;
}

export interface SubmissionDetails {
  id: string;
  isPriority: boolean;
  currentQueueStatus: string;
  submittedAt: string | Date;
  artistName?: string;
  songName?: string;
  albumName?: string;
  durationSeconds?: number;
  artworkUrl?: string;
  externalUrl?: string;
  sourceType?: string;
  sourceTrackId?: string;
  userNotes?: string;
  priorityTierSnapshotId?: string;
}

export interface LiveQueueEntry {
  id: string;
  liveSessionId: string;
  status: QueueStatus | string;
  sortOrder: number;
  priorityRank: number;
  submission: SubmissionDetails;
  loadedIntoPlayerAt?: string | Date | null;
}

export interface LiveSessionData {
  id: string;
  stationId: string;
  status: LiveSessionStatus | string;
  liveTitle: string;
  queueRevision: number;
  submissionsOpen?: boolean;
  freeLineOpen?: boolean;
  paidSubmissionsOpen?: boolean;
  currentQueueEntryId?: string | null;
  currentTrackId?: string | null;
}

export interface HostLiveSessionContextValue {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  liveSession: LiveSessionData | null;
  queue: LiveQueueEntry[];
  currentTrack: TrackSnapshot | null;
  currentPlayingEntry: LiveQueueEntry | null;
  activeAudioUrl: string | null;
  isLoading: boolean;
  isReconciling: boolean;
  socketConnected: boolean;
  socketError: string | null;
  conflictNotice: string | null;
  clearConflictNotice: () => void;
  actionError: string | null;
  clearActionError: () => void;

  // Actions (all strictly respect expectedQueueRevision)
  playNext: () => Promise<void>;
  loadQueueEntry: (entryId: string) => Promise<void>;
  clearPlayer: () => Promise<void>;
  moveToNext: (entryId: string) => Promise<void>;
  changeEntryTier: (
    entryId: string,
    destinationType: "FREE" | "PRIORITY_TIER",
    tierSnapshotId?: string,
  ) => Promise<void>;
  startSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  endSession: () => Promise<void>;
  updateConfig: (dto: {
    submissionsOpen?: boolean;
    freeLineOpen?: boolean;
    paidSubmissionsOpen?: boolean;
  }) => Promise<void>;
  refreshAuthoritativeState: () => Promise<void>;
}

const HostLiveSessionContext =
  React.createContext<HostLiveSessionContextValue | null>(null);

export const HostLiveSessionProvider: React.FC<{
  initialSessionId?: string | null;
  children: React.ReactNode;
}> = ({ initialSessionId = null, children }) => {
  const [sessionId, setSessionIdState] = React.useState<string | null>(
    initialSessionId,
  );
  const [liveSession, setLiveSession] = React.useState<LiveSessionData | null>(
    null,
  );
  const [queue, setQueue] = React.useState<LiveQueueEntry[]>([]);
  const [currentTrack, setCurrentTrack] = React.useState<TrackSnapshot | null>(
    null,
  );
  const [activeAudioUrl, setActiveAudioUrl] = React.useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isReconciling, setIsReconciling] = React.useState<boolean>(false);
  const [conflictNotice, setConflictNotice] = React.useState<string | null>(
    null,
  );
  const [actionError, setActionError] = React.useState<string | null>(null);

  const apiClient = React.useMemo(() => createApiClient(), []);

  const setSessionId = React.useCallback((id: string | null) => {
    setSessionIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem("thequeue_host_session_id", id);
      } else {
        localStorage.removeItem("thequeue_host_session_id");
      }
    }
  }, []);

  // Initialize from storage or props
  React.useEffect(() => {
    if (!sessionId && typeof window !== "undefined") {
      const stored = localStorage.getItem("thequeue_host_session_id");
      if (stored) {
        setSessionIdState(stored);
      }
    }
  }, [sessionId]);

  // Primary Authoritative Reconciliation function
  const refreshAuthoritativeState = React.useCallback(async () => {
    if (!sessionId) return;
    try {
      setIsReconciling(true);
      const [sessionData, queueData] = await Promise.all([
        apiClient.liveSessions.get(sessionId),
        apiClient.liveSessions.getQueue(sessionId),
      ]);

      setLiveSession(sessionData as LiveSessionData);
      setQueue((queueData as LiveQueueEntry[]) || []);

      // If there's an active playing entry, resolve track details
      const playingEntry = (queueData as LiveQueueEntry[] | undefined)?.find(
        (e) => e.status === QueueStatus.PLAYING,
      );

      if (playingEntry?.submission?.sourceTrackId) {
        try {
          const track = await apiClient.tracks.get(
            playingEntry.submission.sourceTrackId,
          );
          setCurrentTrack(track as TrackSnapshot);
          if (track?.id) {
            const dl = await apiClient.tracks.download(track.id);
            if (dl?.downloadUrl) {
              setActiveAudioUrl(dl.downloadUrl);
            }
          }
        } catch {
          // Non-blocking fallback
        }
      } else if (!playingEntry) {
        setCurrentTrack(null);
        setActiveAudioUrl(null);
      }
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj?.status === 404) {
        setSessionId(null);
        setLiveSession(null);
        setQueue([]);
      } else {
        setActionError(errorObj?.message || "Failed to load session state");
      }
    } finally {
      setIsReconciling(false);
      setIsLoading(false);
    }
  }, [sessionId, apiClient, setSessionId]);

  // Initial load on session ID change
  React.useEffect(() => {
    if (sessionId) {
      setIsLoading(true);
      refreshAuthoritativeState();
    } else {
      setLiveSession(null);
      setQueue([]);
      setCurrentTrack(null);
      setActiveAudioUrl(null);
    }
  }, [sessionId, refreshAuthoritativeState]);

  // Handle Socket.IO realtime integration
  const socketHandlers = React.useMemo(
    () => ({
      onSessionStarted: () => refreshAuthoritativeState(),
      onSessionPaused: () => refreshAuthoritativeState(),
      onSessionEnded: () => refreshAuthoritativeState(),
      onPlayerPlayNext: () => refreshAuthoritativeState(),
      onPlayerLoaded: () => refreshAuthoritativeState(),
      onPlayerCleared: () => refreshAuthoritativeState(),
      onReconcile: () => refreshAuthoritativeState(),
    }),
    [refreshAuthoritativeState],
  );

  const { isConnected: socketConnected, socketError } = useLiveSocket(
    sessionId,
    socketHandlers,
  );

  // Unified Error / 409 Conflict handler
  const handleApiMutation = async (mutationFn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await mutationFn();
      // Always reconcile after mutation
      await refreshAuthoritativeState();
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (
        errorObj?.status === 409 ||
        errorObj?.message?.includes("Stale queue revision")
      ) {
        setConflictNotice(
          "The queue was updated from another broadcast action. Synchronizing...",
        );
        await refreshAuthoritativeState();
      } else {
        setActionError(errorObj?.message || "Operation failed");
      }
    }
  };

  // Actions using authoritative revision
  const playNext = async () => {
    if (!sessionId || !liveSession) return;
    await handleApiMutation(() =>
      apiClient.liveSessions.playNext(sessionId, liveSession.queueRevision),
    );
  };

  const loadQueueEntry = async (entryId: string) => {
    if (!sessionId || !liveSession) return;
    await handleApiMutation(() =>
      apiClient.liveSessions.loadQueueEntry(
        sessionId,
        entryId,
        liveSession.queueRevision,
      ),
    );
  };

  const clearPlayer = async () => {
    if (!sessionId || !liveSession) return;
    await handleApiMutation(() =>
      apiClient.liveSessions.clearPlayer(sessionId, liveSession.queueRevision),
    );
  };

  const moveToNext = async (entryId: string) => {
    if (!sessionId || !liveSession) return;
    await handleApiMutation(() =>
      apiClient.liveSessions.moveToNext(
        sessionId,
        entryId,
        liveSession.queueRevision,
      ),
    );
  };

  const changeEntryTier = async (
    entryId: string,
    destinationType: "FREE" | "PRIORITY_TIER",
    tierSnapshotId?: string,
  ) => {
    if (!sessionId) return;
    await handleApiMutation(() =>
      apiClient.liveSessions.changeEntryTier(sessionId, entryId, {
        destinationType,
        tierSnapshotId,
      }),
    );
  };

  const startSession = async () => {
    if (!sessionId || !liveSession) return;
    await handleApiMutation(() =>
      apiClient.liveSessions.start(sessionId, liveSession.queueRevision),
    );
  };

  const pauseSession = async () => {
    if (!sessionId || !liveSession) return;
    await handleApiMutation(() =>
      apiClient.liveSessions.pause(sessionId, liveSession.queueRevision),
    );
  };

  const resumeSession = async () => {
    if (!sessionId || !liveSession) return;
    await handleApiMutation(() =>
      apiClient.liveSessions.resume(sessionId, liveSession.queueRevision),
    );
  };

  const endSession = async () => {
    if (!sessionId || !liveSession) return;
    await handleApiMutation(() =>
      apiClient.liveSessions.end(sessionId, liveSession.queueRevision),
    );
  };

  const updateConfig = async (dto: {
    submissionsOpen?: boolean;
    freeLineOpen?: boolean;
    paidSubmissionsOpen?: boolean;
  }) => {
    if (!sessionId) return;
    await handleApiMutation(() =>
      apiClient.liveSessions.updateConfiguration(sessionId, dto),
    );
  };

  const currentPlayingEntry = React.useMemo(() => {
    return queue.find((e) => e.status === QueueStatus.PLAYING) || null;
  }, [queue]);

  const value: HostLiveSessionContextValue = {
    sessionId,
    setSessionId,
    liveSession,
    queue,
    currentTrack,
    currentPlayingEntry,
    activeAudioUrl,
    isLoading,
    isReconciling,
    socketConnected,
    socketError,
    conflictNotice,
    clearConflictNotice: () => setConflictNotice(null),
    actionError,
    clearActionError: () => setActionError(null),

    playNext,
    loadQueueEntry,
    clearPlayer,
    moveToNext,
    changeEntryTier,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    updateConfig,
    refreshAuthoritativeState,
  };

  return (
    <HostLiveSessionContext.Provider value={value}>
      {children}
    </HostLiveSessionContext.Provider>
  );
};

export const useHostLiveSession = () => {
  const context = React.useContext(HostLiveSessionContext);
  if (!context) {
    throw new Error(
      "useHostLiveSession must be used within a HostLiveSessionProvider",
    );
  }
  return context;
};
