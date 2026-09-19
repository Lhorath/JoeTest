"use client";

import * as React from "react";
import { Button, Card, Badge, Dialog } from "@platform/ui";
import { Music, Plus, UploadCloud, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { TrackSummary } from "@platform/types";
import { api } from "../../lib/api";
import { TrackItem } from "../../components/TrackItem";
import { TrackUploader } from "../../components/TrackUploader";

export default function MusicLibraryPage() {
  const [tracks, setTracks] = React.useState<TrackSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [activePlayingTrackId, setActivePlayingTrackId] = React.useState<string | null>(null);

  const fetchTracks = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await api.tracks.list();
      setTracks(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load music library");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchTracks();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-50 flex items-center gap-3">
            <Music className="h-6 w-6 sm:h-7 sm:w-7 text-violet-500" />
            Music Library
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Manage your audio tracks, metadata, and submissions library
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTracks(true)}
            disabled={isLoading || isRefreshing}
            className="gap-2 min-h-[44px]"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="gap-2 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            Upload New Track
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tracks List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-zinc-400">Loading your music library...</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl p-8 space-y-4">
          <div className="h-14 w-14 rounded-full bg-violet-600/10 text-violet-400 flex items-center justify-center mx-auto">
            <UploadCloud className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-100">
              No tracks uploaded yet
            </h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              Upload your audio tracks to easily submit them to live streaming sessions.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsUploadModalOpen(true)}
            className="gap-2 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            Upload Your First Track
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-2">
            <span>{tracks.length} {tracks.length === 1 ? "Track" : "Tracks"} in Library</span>
            <span>Audio Preview & Management</span>
          </div>

          <div className="space-y-2">
            {tracks.map((track) => (
              <TrackItem
                key={track.id}
                track={track}
                activePlayingTrackId={activePlayingTrackId}
                onPlayToggle={(id) => setActivePlayingTrackId(id)}
                onUpdated={() => fetchTracks(true)}
                onDeleted={() => {
                  if (activePlayingTrackId === track.id) {
                    setActivePlayingTrackId(null);
                  }
                  fetchTracks(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upload Track Dialog */}
      <Dialog
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Audio Track"
      >
        <TrackUploader
          onSuccess={() => {
            setIsUploadModalOpen(false);
            fetchTracks(true);
          }}
          onCancel={() => setIsUploadModalOpen(false)}
        />
      </Dialog>
    </div>
  );
}
