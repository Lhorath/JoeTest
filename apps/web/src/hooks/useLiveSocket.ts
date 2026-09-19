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
  isHost?: boolean;
}

export interface SocketEventHandlers {
  onSessionStarted?: (payload: SocketSessionEventPayload) => void;
  onSessionPaused?: (payload: SocketSessionEventPayload) => void;
  onSessionEnded?: (payload: SocketSessionEventPayload) => void;
  onPlayerPlayNext?: (payload: SocketPlayerEventPayload) => void;
  onPlayerLoaded?: (payload: SocketPlayerEventPayload) => void;
  onPlayerCleared?: (payload: SocketPlayerEventPayload) => void;
  onQueueUpdated?: (payload: any) => void;
  onReconcile?: () => void;
}

export const useLiveSocket = (
  sessionId: string | null,
  handlers: SocketEventHandlers,
) => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [socketError, setSocketError] = React.useState<string | null>(null);
  const socketRef = React.useRef<Socket | null>(null);

  // Resilience tracking: track last known revision & processed event IDs
  const lastKnownRevisionRef = React.useRef<number>(0);
  const processedEventIdsRef = React.useRef<Set<string>>(new Set());

  // Keep handlers fresh in ref
  const handlersRef = React.useRef(handlers);
  React.useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const handleAuthoritativeEvent = React.useCallback(
    (
      payload: { queueRevision?: number; eventId?: string },
      action?: () => void,
    ) => {
      // 1. Deduplicate by eventId if present
      if (payload.eventId) {
        if (processedEventIdsRef.current.has(payload.eventId)) {
          return;
        }
        processedEventIdsRef.current.add(payload.eventId);
        if (processedEventIdsRef.current.size > 200) {
          const firstKey = processedEventIdsRef.current.keys().next().value;
          if (firstKey) processedEventIdsRef.current.delete(firstKey);
        }
      }

      // 2. Revision comparison
      if (typeof payload.queueRevision === "number") {
        // Out-of-order or duplicate event: discard if revision <= last known
        if (
          lastKnownRevisionRef.current > 0 &&
          payload.queueRevision <= lastKnownRevisionRef.current
        ) {
          return;
        }

        // Missing event gap detected: fetch full snapshot reconciliation
        if (
          lastKnownRevisionRef.current > 0 &&
          payload.queueRevision > lastKnownRevisionRef.current + 1
        ) {
          lastKnownRevisionRef.current = payload.queueRevision;
          handlersRef.current.onReconcile?.();
          return;
        }

        lastKnownRevisionRef.current = payload.queueRevision;
      }

      action?.();
      handlersRef.current.onReconcile?.();
    },
    [],
  );

  React.useEffect(() => {
    if (!sessionId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      lastKnownRevisionRef.current = 0;
      processedEventIdsRef.current.clear();
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      // When separate WS URL is not configured, use authoritative polling fallback
      setIsConnected(true);
      const pollInterval = setInterval(() => {
        handlersRef.current.onReconcile?.();
      }, 5000);
      return () => clearInterval(pollInterval);
    }

    const socketUrl = wsUrl;

    let socket: Socket | null = null;
    try {
      socket = io(socketUrl, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 5000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setIsConnected(true);
        setSocketError(null);
        // Join authoritative session room
        socket?.emit(
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

      socket.on("connect_error", () => {
        setIsConnected(false);
      });

      socket.on("reconnect", () => {
        setIsConnected(true);
        socket?.emit("join-session", { sessionId }, () => {
          handlersRef.current.onReconcile?.();
        });
      });

      // Authoritative event listeners with resilience filtering
      socket.on("session.started", (data: SocketSessionEventPayload) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onSessionStarted?.(data));
      });

      socket.on("session.paused", (data: SocketSessionEventPayload) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onSessionPaused?.(data));
      });

      socket.on("session.ended", (data: SocketSessionEventPayload) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onSessionEnded?.(data));
      });

      socket.on("player.playNext", (data: SocketPlayerEventPayload) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onPlayerPlayNext?.(data));
      });

      socket.on("player.loaded", (data: SocketPlayerEventPayload) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onPlayerLoaded?.(data));
      });

      socket.on("player.cleared", (data: SocketPlayerEventPayload) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onPlayerCleared?.(data));
      });

      socket.on("queue.entryAdded", (data: any) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onQueueUpdated?.(data));
      });

      socket.on("queue.entryMoved", (data: any) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onQueueUpdated?.(data));
      });

      socket.on("queue.entrySkipped", (data: any) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onQueueUpdated?.(data));
      });

      socket.on("queue.entryCompleted", (data: any) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onQueueUpdated?.(data));
      });

      socket.on("queue.entryRemoved", (data: any) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onQueueUpdated?.(data));
      });

      socket.on("queue.reordered", (data: any) => {
        handleAuthoritativeEvent(data, () => handlersRef.current.onQueueUpdated?.(data));
      });
    } catch {
      // Fallback
    }

    // Polling safety timer alongside socket
    const pollInterval = setInterval(() => {
      handlersRef.current.onReconcile?.();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId, handleAuthoritativeEvent]);

  return {
    isConnected,
    socketError,
    reconcile: () => handlersRef.current.onReconcile?.(),
  };
};
