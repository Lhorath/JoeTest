"use client";

import * as React from "react";
import { Button, Badge, Card } from "@platform/ui";
import {
  UserSubmissionSummary,
  QueueStatus,
} from "@platform/types";
import {
  Send,
  Music,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Loader2,
  Radio,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../lib/api";
import { UpgradeModal } from "../../components/UpgradeModal";

export default function UserSubmissionsPage() {
  const [submissions, setSubmissions] = React.useState<UserSubmissionSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<string>("ALL");

  const [selectedSubmissionForUpgrade, setSelectedSubmissionForUpgrade] =
    React.useState<UserSubmissionSummary | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = React.useState(false);

  const fetchSubmissions = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await api.submissions.getMine();
      setSubmissions(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load submission history");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchSubmissions();
  }, []);

  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((sub) => {
      if (activeFilter === "IN_QUEUE") {
        return (
          sub.currentQueueStatus === QueueStatus.QUEUED ||
          sub.currentQueueStatus === QueueStatus.NEXT ||
          sub.currentQueueStatus === QueueStatus.PLAYING
        );
      }
      if (activeFilter === "PRIORITY") {
        return sub.isPriority;
      }
      if (activeFilter === "PLAYED") {
        return (
          sub.currentQueueStatus === QueueStatus.COMPLETED ||
          sub.currentQueueStatus === QueueStatus.SKIPPED ||
          sub.currentQueueStatus === QueueStatus.MOVED_TO_HISTORY
        );
      }
      return true;
    });
  }, [submissions, activeFilter]);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: QueueStatus | string) => {
    switch (status) {
      case QueueStatus.PLAYING:
        return <Badge variant="success">Currently Playing</Badge>;
      case QueueStatus.NEXT:
        return <Badge variant="warning">Up Next</Badge>;
      case QueueStatus.QUEUED:
        return <Badge variant="info">In Live Queue</Badge>;
      case QueueStatus.COMPLETED:
        return <Badge variant="secondary">Completed / Reviewed</Badge>;
      case QueueStatus.SKIPPED:
        return <Badge variant="secondary">Skipped</Badge>;
      case QueueStatus.MOVED_TO_HISTORY:
        return <Badge variant="secondary">Archived</Badge>;
      case QueueStatus.REJECTED:
      case QueueStatus.REMOVED:
        return <Badge variant="danger">Disqualified</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleOpenUpgrade = (sub: UserSubmissionSummary) => {
    setSelectedSubmissionForUpgrade(sub);
    setIsUpgradeModalOpen(true);
  };

  const filterTabs = [
    { id: "ALL", label: `All (${submissions.length})` },
    {
      id: "IN_QUEUE",
      label: `In Queue (${
        submissions.filter(
          (s) =>
            s.currentQueueStatus === QueueStatus.QUEUED ||
            s.currentQueueStatus === QueueStatus.NEXT ||
            s.currentQueueStatus === QueueStatus.PLAYING,
        ).length
      })`,
    },
    {
      id: "PRIORITY",
      label: `Priority (${submissions.filter((s) => s.isPriority).length})`,
    },
    {
      id: "PLAYED",
      label: `Completed (${
        submissions.filter(
          (s) =>
            s.currentQueueStatus === QueueStatus.COMPLETED ||
            s.currentQueueStatus === QueueStatus.SKIPPED ||
            s.currentQueueStatus === QueueStatus.MOVED_TO_HISTORY,
        ).length
      })`,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-50 flex items-center gap-3">
            <Send className="h-6 w-6 sm:h-7 sm:w-7 text-violet-500" />
            My Submissions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Track your song review status, queue positions, and priority upgrades across all stations
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSubmissions(true)}
            disabled={isLoading || isRefreshing}
            className="gap-2 min-h-[44px]"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link href="/hosts">
            <Button variant="primary" size="sm" className="gap-2 min-h-[44px]">
              <Radio className="h-4 w-4" />
              Find Live Stations
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      {submissions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors min-h-[38px] cursor-pointer ${
                  isSelected
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submissions List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-zinc-400">Loading your submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl p-8 space-y-4">
          <div className="h-14 w-14 rounded-full bg-zinc-900 text-zinc-500 flex items-center justify-center mx-auto">
            <Send className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-100">
              No Submissions Yet
            </h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              You haven't submitted any tracks to live sessions yet. Check out currently broadcasting hosts and join their queues!
            </p>
          </div>
          <Link href="/hosts">
            <Button variant="primary" className="gap-2 min-h-[44px]">
              <Radio className="h-4 w-4" /> Browse Live Stations
            </Button>
          </Link>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl p-6 space-y-2">
          <p className="text-sm font-semibold text-zinc-300">
            No submissions in this filter category
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveFilter("ALL")}
          >
            Show All Submissions
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-2">
            <span>Showing {filteredSubmissions.length} of {submissions.length} Submissions</span>
            <span>Live Status & Actions</span>
          </div>

          <div className="space-y-3">
            {filteredSubmissions.map((sub) => {
              const isQueued = sub.currentQueueStatus === "QUEUED";
              const canUpgrade = isQueued && sub.sessionStatus !== "ENDED";

              return (
                <Card
                  key={sub.id}
                  className="border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1 w-full sm:w-auto">
                    <div className="p-3 bg-violet-600/10 text-violet-400 rounded-lg shrink-0 mt-0.5 sm:mt-0">
                      <Music className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-zinc-100 truncate">
                          {sub.songName}
                        </h4>

                        {sub.isPriority ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-violet-950/80 text-violet-300 border border-violet-700/80">
                            <Sparkles className="h-3 w-3" />
                            {sub.tierName || "Priority"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Free Line
                          </span>
                        )}

                        {getStatusBadge(sub.currentQueueStatus)}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
                        <span className="text-zinc-300 font-medium">
                          {sub.artistName}
                        </span>
                        <span>•</span>
                        <Link
                          href={`/session/${sub.liveSessionId}`}
                          className="text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1"
                        >
                          {sub.stationName}
                        </Link>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {formatDuration(sub.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Links */}
                  <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                    {canUpgrade && !sub.isPriority && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenUpgrade(sub)}
                        className="gap-1.5 text-xs min-h-[40px]"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Upgrade to Priority
                      </Button>
                    )}

                    <Link href={`/session/${sub.liveSessionId}`} className="w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="gap-1 text-xs w-full sm:w-auto min-h-[40px]">
                        View Station <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        submission={selectedSubmissionForUpgrade}
        onUpgradeSuccess={() => {
          fetchSubmissions(true);
        }}
      />
    </div>
  );
}
