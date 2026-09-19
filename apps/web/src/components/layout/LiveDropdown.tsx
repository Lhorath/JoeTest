"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PublicLiveSessionSummary } from "@platform/types";
import { api } from "@/lib/api";
import { Radio, ChevronDown, Music, Play, ExternalLink, Sparkles, Volume2 } from "lucide-react";
import { Badge } from "@platform/ui";

export function LiveDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<PublicLiveSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchLive = async () => {
    try {
      const res = await api.liveSessions.getPublic();
      setSessions(res || []);
    } catch (err) {
      console.warn("Failed to fetch live sessions for dropdown:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const liveCount = sessions.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        id="live-stations-dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold tracking-wide transition-all shadow-sm shadow-red-950/20"
        aria-expanded={isOpen}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="font-bold">LIVE</span>
        {liveCount > 0 && (
          <span className="bg-red-500/30 text-red-200 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
            {liveCount}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          id="live-stations-dropdown-panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/50">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-red-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Live Broadcasts ({liveCount})
              </span>
            </div>
            <Link
              href="/hosts"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-medium text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              View all
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/50 p-1">
            {loading && sessions.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                Checking live stations...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center">
                <Radio className="h-8 w-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-zinc-400">
                  No active host streams right now
                </p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Hosts broadcast regularly. Explore stations to see past streams.
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <Link
                  key={session.id}
                  href={session.stationSlug ? `/${session.stationSlug}` : `/session/${session.id}`}
                  onClick={() => setIsOpen(false)}
                  className="p-3 hover:bg-zinc-800/60 rounded-lg block transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-zinc-200 group-hover:text-violet-400 transition-colors truncate">
                          {session.stationName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-400 uppercase tracking-wider">
                          {session.primaryStreamingPlatform}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-normal">
                        {session.liveTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-800/40 text-[10px]">
                    <span className="text-zinc-500 font-medium flex items-center gap-1">
                      Host: <span className="text-zinc-400">{session.hostName}</span>
                    </span>
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        session.submissionsOpen ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          session.submissionsOpen ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      {session.submissionsOpen ? "Queue Open" : "Queue Paused"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="p-2.5 bg-zinc-950/60 border-t border-zinc-800/80 text-center">
            <Link
              href="/hosts"
              onClick={() => setIsOpen(false)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
            >
              <Music className="h-3.5 w-3.5 text-violet-400" />
              <span>Browse All Stations & Streams</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
