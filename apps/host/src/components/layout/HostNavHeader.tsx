"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutDashboard, Radio, User, LogOut } from "lucide-react";
import { Badge, Button, LiveStatusBadge } from "@platform/ui";
import { useAuth } from "../../providers/AuthProvider";
import { useHostLiveSession } from "../../providers/HostLiveSessionProvider";
import { LiveSessionStatus } from "@platform/types";

export const HostNavHeader: React.FC = () => {
  const { user, isAuthenticated, isHost, logout } = useAuth();
  const { liveSession, sessionId } = useHostLiveSession();

  const isLive = liveSession?.status === LiveSessionStatus.LIVE;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-black text-lg text-amber-500 font-sans tracking-wide"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>TheQueue</span>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              HOST
            </span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-400">
            <Link href="/" className="hover:text-zinc-100 transition-colors">
              Overview
            </Link>
            <Link
              href="/queue"
              className="text-amber-400 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1.5"
            >
              <Radio className="h-3.5 w-3.5" />
              Live DJ Dashboard
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Live Badge */}
          {sessionId && liveSession ? (
            <LiveStatusBadge status={liveSession.status} />
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-[11px] uppercase tracking-wider"
              >
                No Active Broadcast
              </Badge>
            </div>
          )}

          {/* User Account / Sign In */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 border-l border-zinc-800 pl-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">
                  {user.displayName?.[0] || user.username?.[0] || "H"}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-zinc-200 truncate max-w-[120px]">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-[10px] text-amber-500 font-mono">
                    {user.roles.includes("HOST") ? "Verified Host" : "Admin"}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                title="Sign Out"
                className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-950/20"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
