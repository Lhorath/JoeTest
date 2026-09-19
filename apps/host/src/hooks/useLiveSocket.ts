"use client";

import * as React from "react";
import { io, Socket } from "socket.io-client";

export interface SocketSessionEventPayload {
  sessionId: string;
  queueRevision: number;
  status?: string;
  timestamp?: string;
}

export interface SocketPlayerEventPayload {
  sessionId: string;
  queueRevision: number;
  currentQueueEntryId?: string | null;
  loadedIntoPlayerAt?: string | null;
  timestamp?: string;
}

export interface SocketJoinResponse {
  success: boolean;
  snapshot?: Record<string, unknown>;
  message?: string;
}

export interface SocketEventHandlers {
  onSessionStarted?: (payload: SocketSessionEventPayload) => void;
  onSessionPaused?: (payload: SocketSessionEventPayload) => void;
  onSessionEnded?: (payload: SocketSessionEventPayload) => void;
  onPlayerPlayNext?: (payload: SocketPlayerEventPayload) => void;
  onPlayerLoaded?: (payload: SocketPlayerEventPayload) => void;
  onPlayerCleared?: (payload: SocketPlayerEventPayload) => void;
  onReconcile?: () => void;
}

export const useLiveSocket = (
  sessionId: string | null,
  handlers: SocketEventHandlers,
) => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [socketError, setSocketError] = React.useState<string | null>(null);
  const socketRef = React.useRef<Socket | null>(null);

  // Keep handlers fresh in ref to avoid re-subscribing socket continuously
  const handlersRef = React.useRef(handlers);
  React.useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  React.useEffect(() => {
    if (!sessionId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      setIsConnected(true);
      const pollInterval = setInterval(() => {
        handlersRef.current.onReconcile?.();
      }, 5000);
      return () => clearInterval(pollInterval);
    }

    const socketUrl = wsUrl;

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setSocketError(null);
      // Join authoritative session room
      socket.emit(
        "join-session",
        { sessionId },
        (res: SocketJoinResponse) => {
          if (res?.success) {
            handlersRef.current.onReconcile?.();
          } else {
            setSocketError(res?.message || "Failed to join live session room");
          }
        },
      );
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (err: Error) => {
      setIsConnected(false);
      setSocketError(err?.message || "WebSocket connection failed");
    });

    socket.on("reconnect", () => {
      setIsConnected(true);
      socket.emit("join-session", { sessionId }, () => {
        handlersRef.current.onReconcile?.();
      });
    });

    // Authoritative event listeners
    socket.on("session.started", (data: SocketSessionEventPayload) => {
      handlersRef.current.onSessionStarted?.(data);
      handlersRef.current.onReconcile?.();
    });

    socket.on("session.paused", (data: SocketSessionEventPayload) => {
      handlersRef.current.onSessionPaused?.(data);
      handlersRef.current.onReconcile?.();
    });

    socket.on("session.ended", (data: SocketSessionEventPayload) => {
      handlersRef.current.onSessionEnded?.(data);
      handlersRef.current.onReconcile?.();
    });

    socket.on("player.playNext", (data: SocketPlayerEventPayload) => {
      handlersRef.current.onPlayerPlayNext?.(data);
      handlersRef.current.onReconcile?.();
    });

    socket.on("player.loaded", (data: SocketPlayerEventPayload) => {
      handlersRef.current.onPlayerLoaded?.(data);
      handlersRef.current.onReconcile?.();
    });

    socket.on("player.cleared", (data: SocketPlayerEventPayload) => {
      handlersRef.current.onPlayerCleared?.(data);
      handlersRef.current.onReconcile?.();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId]);

  return {
    isConnected,
    socketError,
  };
};
