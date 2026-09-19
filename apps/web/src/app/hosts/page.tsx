"use client";

import * as React from "react";
import { Button, Badge } from "@platform/ui";
import { Radio, RefreshCw, AlertCircle, Loader2, Search, Filter, Sparkles, Layers } from "lucide-react";
import { PublicLiveSessionSummary, StationSummary } from "@platform/types";
import { api } from "../../lib/api";
import { LiveStationCard, StationCardData } from "../../components/LiveStationCard";

export default function LiveStationsPage() {
  const [stationCards, setStationCards] = React.useState<StationCardData[]>([]);
  const [liveCount, setLiveCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "LIVE" | "OFFLINE">("ALL");

  const fetchStations = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [stationsList, liveSessionsList] = await Promise.all([
        api.stations.list().catch(() => [] as StationSummary[]),
        api.liveSessions.getPublic().catch(() => [] as PublicLiveSessionSummary[]),
      ]);

      const liveMap = new Map<string, PublicLiveSessionSummary>();
      for (const liveSess of liveSessionsList) {
        if (liveSess.stationId) {
          liveMap.set(liveSess.stationId, liveSess);
        }
        if (liveSess.stationSlug) {
          liveMap.set(liveSess.stationSlug.toLowerCase(), liveSess);
        }
      }

      const cards: StationCardData[] = [];
      const seenSlugs = new Set<string>();

      // 1. Process all active stations
      for (const st of stationsList) {
        const liveSess = liveMap.get(st.id) || liveMap.get(st.slug.toLowerCase());
        const isLive = Boolean(st.isLive || liveSess);

        cards.push({
          id: st.id,
          stationName: st.stationName,
          hostName: st.hostName || liveSess?.hostName || st.stationName,
          slug: st.slug,
          primaryStreamingPlatform: st.primaryStreamingPlatform,
          streamUrl: st.streamUrl || liveSess?.streamUrl || null,
          description: st.description || null,
          isLive,
          liveSessionId: liveSess?.id || st.currentLiveSessionId || null,
          liveTitle: liveSess?.liveTitle || null,
          submissionsOpen: liveSess?.submissionsOpen ?? false,
          paidSubmissionsOpen: liveSess?.paidSubmissionsOpen ?? false,
          freeLineOpen: liveSess?.freeLineOpen ?? false,
          maxTrackDurationSeconds: st.maxTrackDurationSeconds,
          explicitContentAllowed: st.explicitContentAllowed,
        });

        seenSlugs.add(st.slug.toLowerCase());
      }

      // 2. Add any live session whose station might not be in stationsList
      for (const liveSess of liveSessionsList) {
        if (liveSess.stationSlug && !seenSlugs.has(liveSess.stationSlug.toLowerCase())) {
          cards.push({
            id: liveSess.stationId || liveSess.id,
            stationName: liveSess.stationName,
            hostName: liveSess.hostName,
            slug: liveSess.stationSlug,
            primaryStreamingPlatform: liveSess.primaryStreamingPlatform,
            streamUrl: liveSess.streamUrl || null,
            description: null,
            isLive: true,
            liveSessionId: liveSess.id,
            liveTitle: liveSess.liveTitle || null,
            submissionsOpen: liveSess.submissionsOpen,
            paidSubmissionsOpen: liveSess.paidSubmissionsOpen,
            freeLineOpen: liveSess.freeLineOpen,
          });
          seenSlugs.add(liveSess.stationSlug.toLowerCase());
        }
      }

      // Sort: Live first, then alphabetical by station name
      cards.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return a.stationName.localeCompare(b.stationName);
      });

      setStationCards(cards);
      setLiveCount(cards.filter((c) => c.isLive).length);
    } catch (err: any) {
      setError(err?.message || "Failed to load station directory");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchStations();
    const interval = setInterval(() => {
      fetchStations(true);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const filteredCards = React.useMemo(() => {
    return stationCards.filter((s) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        s.stationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.hostName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.liveTitle?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlatform =
        selectedPlatform === "ALL" ||
        s.primaryStreamingPlatform === selectedPlatform;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "LIVE" && s.isLive) ||
        (statusFilter === "OFFLINE" && !s.isLive);

      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [stationCards, searchQuery, selectedPlatform, statusFilter]);

  const platforms = [
    { id: "ALL", label: "All Platforms" },
    { id: "TWITCH", label: "Twitch" },
    { id: "YOUTUBE", label: "YouTube" },
    { id: "KICK", label: "Kick" },
    { id: "TIKTOK", label: "TikTok" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-50 flex items-center gap-2.5">
              <Radio className="h-6 w-6 sm:h-7 sm:text-violet-400 text-violet-500 animate-pulse" />
              Host Station Directory
            </h1>
            {liveCount > 0 ? (
              <Badge variant="success" className="text-xs">
                {liveCount} Live Now
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {stationCards.length} Stations
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Discover streamer stations, explore persistent vanity links, and tune in to live audio broadcast decks.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStations(true)}
          disabled={isLoading || isRefreshing}
          className="gap-2 self-start sm:self-auto min-h-[44px]"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh Directory
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search stations, hosts, vanity slugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-md bg-zinc-950 border border-zinc-700/80 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Live/Offline Filter */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors min-h-[34px] cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-zinc-800 text-white shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All ({stationCards.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("LIVE")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors min-h-[34px] cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "LIVE"
                ? "bg-emerald-600 text-white shadow"
                : "text-zinc-400 hover:text-emerald-400"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live ({liveCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("OFFLINE")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors min-h-[34px] cursor-pointer ${
              statusFilter === "OFFLINE"
                ? "bg-zinc-800 text-white shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Offline ({stationCards.length - liveCount})
          </button>
        </div>

        {/* Platform Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {platforms.map((p) => {
            const isSelected = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p.id)}
                className={`px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors min-h-[38px] cursor-pointer ${
                  isSelected
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Directory Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-zinc-400">Discovering active host stations...</p>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl p-6 sm:p-8 space-y-4">
          <div className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
            <Radio className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-zinc-200">
              {stationCards.length === 0
                ? "No Broadcaster Stations Available"
                : "No Stations Match Your Filters"}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              {stationCards.length === 0
                ? "Check back soon or apply to become a host. Verified broadcaster stations appear here automatically."
                : "Try resetting your search query or setting the status filter to All."}
            </p>
          </div>
          {stationCards.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedPlatform("ALL");
                setStatusFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCards.map((station) => (
            <LiveStationCard key={station.id} station={station} />
          ))}
        </div>
      )}
    </div>
  );
}

