"use client";

import * as React from "react";
import {
  Radio,
  Play,
  Pause,
  Square,
  Settings,
  Layers,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { Button, LiveStatusBadge, Dialog } from "@platform/ui";
import { useHostLiveSession } from "../../providers/HostLiveSessionProvider";
import { LiveSessionStatus } from "@platform/types";

export interface SessionControlHeaderProps {
  onOpenConfig: () => void;
  onOpenLauncher: () => void;
}

export const SessionControlHeader: React.FC<SessionControlHeaderProps> = ({
  onOpenConfig,
  onOpenLauncher,
}) => {
  const {
    sessionId,
    liveSession,
    socketConnected,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    actionError,
    clearActionError,
  } = useHostLiveSession();

  const [isEndModalOpen, setIsEndModalOpen] = React.useState(false);
  const [isActionPending, setIsActionPending] = React.useState(false);

  const status = liveSession?.status || LiveSessionStatus.PREPARING;
  const isLive = status === LiveSessionStatus.LIVE;
  const isPaused = status === LiveSessionStatus.PAUSED;
  const isPreparing =
    status === LiveSessionStatus.PREPARING ||
    status === LiveSessionStatus.SCHEDULED;
  const isEnded = status === LiveSessionStatus.ENDED;

  const handleStart = async () => {
    try {
      setIsActionPending(true);
      await startSession();
    } finally {
      setIsActionPending(false);
    }
  };

  const handlePause = async () => {
    try {
      setIsActionPending(true);
      await pauseSession();
    } finally {
      setIsActionPending(false);
    }
  };

  const handleResume = async () => {
    try {
      setIsActionPending(true);
      await resumeSession();
    } finally {
      setIsActionPending(false);
    }
  };

  const handleEnd = async () => {
    try {
      setIsActionPending(true);
      await endSession();
      setIsEndModalOpen(false);
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Banner error if any */}
      {actionError && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={clearActionError}
            className="text-red-400 hover:text-red-200 text-xs underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm">
        {/* Left Side: Session Title, Status, and Socket Health */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <LiveStatusBadge status={status} />

            {/* Socket Connection Pill */}
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                socketConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {socketConnected ? (
                <>
                  <Wifi className="h-3 w-3" /> Realtime Sync Active
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" /> Connecting Stream Room...
                </>
              )}
            </span>

            {sessionId && (
              <span className="text-[11px] font-mono text-zinc-500">
                Session ID: {sessionId.slice(0, 8)}...
              </span>
            )}
          </div>

          <h1 className="text-xl font-extrabold tracking-tight text-zinc-50 truncate">
            {liveSession?.liveTitle || "No Active Live Broadcast Selected"}
          </h1>
          <p className="text-xs text-zinc-400">
            Station:{" "}
            <span className="font-semibold text-zinc-300">
              {liveSession?.stationId || "None"}
            </span>{" "}
            • Platform:{" "}
            <span className="font-semibold text-zinc-300">
              {(liveSession as any)?.primaryStreamingPlatform || "KICK"}
            </span>
          </p>
        </div>

        {/* Right Side: Host Session Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {sessionId ? (
            <>
              {/* Start Session (Go Live) */}
              {isPreparing && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStart}
                  isLoading={isActionPending}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/20"
                >
                  <Radio className="mr-1.5 h-4 w-4" /> Go Live
                </Button>
              )}

              {/* Pause Session */}
              {isLive && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={handlePause}
                  isLoading={isActionPending}
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                >
                  <Pause className="mr-1.5 h-4 w-4" /> Pause Broadcast
                </Button>
              )}

              {/* Resume Session */}
              {isPaused && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleResume}
                  isLoading={isActionPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  <Play className="mr-1.5 h-4 w-4 fill-current" /> Resume Live
                </Button>
              )}

              {/* End Session */}
              {!isEnded && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setIsEndModalOpen(true)}
                  className="text-zinc-400 hover:text-red-400 hover:bg-red-950/20"
                >
                  <Square className="mr-1.5 h-4 w-4" /> End Session
                </Button>
              )}

              {/* Settings Drawer Button */}
              <Button
                variant="outline"
                size="md"
                onClick={onOpenConfig}
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </>
          ) : null}

          {/* Launcher / Switch Session Button */}
          <Button
            variant="outline"
            size="md"
            onClick={onOpenLauncher}
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
          >
            <Layers className="mr-1.5 h-4 w-4 text-amber-500" />
            {sessionId ? "Switch Session" : "Launch Session"}
          </Button>
        </div>
      </header>

      {/* End Session Confirmation Dialog */}
      <Dialog
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        title="End Broadcast Session?"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Ending this broadcast session will close incoming submissions,
            archive current playback, and notify all active listeners.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEndModalOpen(false)}
              disabled={isActionPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleEnd}
              isLoading={isActionPending}
            >
              Confirm & End Broadcast
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
