"use client";

import * as React from "react";
import { Button, Input, Checkbox, Card, Badge } from "@platform/ui";
import { UploadCloud, Music, CheckCircle2, AlertCircle, Loader2, X, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { ArtistIdentitySummary } from "@platform/types";

interface TrackUploaderProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const TrackUploader: React.FC<TrackUploaderProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [songName, setSongName] = React.useState("");
  const [artistName, setArtistName] = React.useState("");
  const [albumName, setAlbumName] = React.useState("");
  const [bpm, setBpm] = React.useState<string>("");
  const [musicalKey, setMusicalKey] = React.useState("");
  const [explicitContent, setExplicitContent] = React.useState(false);
  const [artistIdentities, setArtistIdentities] = React.useState<ArtistIdentitySummary[]>([]);
  const [selectedIdentityId, setSelectedIdentityId] = React.useState<string>("");

  const [isDragging, setIsDragging] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    api.artists.list().then((list) => {
      setArtistIdentities(list || []);
      if (list && list.length > 0) {
        const def = list.find((i) => i.isDefault) || list[0];
        setSelectedIdentityId(def.id);
        setArtistName(def.artistName);
      }
    }).catch(() => {});
  }, []);

  const handleIdentityChange = (id: string) => {
    setSelectedIdentityId(id);
    if (id === "custom") {
      setArtistName("");
    } else {
      const found = artistIdentities.find((i) => i.id === id);
      if (found) {
        setArtistName(found.artistName);
      }
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    // Validate audio file
    if (!selectedFile.type.startsWith("audio/") && !selectedFile.name.match(/\.(mp3|wav|flac|aac|m4a|ogg)$/i)) {
      setError("Please select a valid audio file (.mp3, .wav, .flac, .aac, .ogg)");
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      setError("Audio file must be under 100MB");
      return;
    }

    setError(null);
    setFile(selectedFile);

    // Auto-fill song title from filename if empty
    if (!songName) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      setSongName(cleanName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an audio file to upload");
      return;
    }
    if (!songName.trim()) {
      setError("Song title is required");
      return;
    }
    if (!artistName.trim()) {
      setError("Artist name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Request presigned upload URL from API
      setUploadProgress("Preparing upload intent...");
      const uploadIntent = await api.tracks.createUploadUrl({
        songName: songName.trim(),
        artistName: artistName.trim(),
        albumName: albumName.trim() || undefined,
        explicitContent,
        bpm: bpm ? parseInt(bpm, 10) : undefined,
        musicalKey: musicalKey.trim() || undefined,
        originalFilename: file.name,
        mimeType: file.type || "audio/mpeg",
        fileSize: file.size,
      });

      // Step 2: Upload file binary directly to presigned URL
      setUploadProgress("Uploading audio to secure storage...");
      const uploadRes = await fetch(uploadIntent.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "audio/mpeg",
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload audio payload to storage");
      }

      // Step 3: Complete upload in API
      setUploadProgress("Finalizing track and metadata...");
      await api.tracks.completeUpload(uploadIntent.trackId, uploadIntent.uploadIntentId);

      setUploadProgress("Upload complete!");
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "An error occurred during upload. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800 rounded-md text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File Dropzone */}
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragging
              ? "border-violet-500 bg-violet-950/20"
              : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500 hover:bg-zinc-900/70"
          }`}
        >
          <UploadCloud className="h-10 w-10 text-zinc-400 mb-3" />
          <p className="text-sm font-medium text-zinc-200">
            Click to upload or drag & drop audio file
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            MP3, WAV, FLAC, AAC up to 100MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelected(e.target.files[0]);
              }
            }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600/20 text-violet-400 rounded-md">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100 truncate max-w-xs">
                {file.name}
              </p>
              <p className="text-xs text-zinc-400">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          {!isSubmitting && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Metadata Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
            Song Title *
          </label>
          <Input
            value={songName}
            onChange={(e) => setSongName(e.target.value)}
            placeholder="e.g. Midnight Horizon"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Artist / Identity *
            </label>
            {artistIdentities.length > 0 && (
              <select
                value={selectedIdentityId}
                onChange={(e) => handleIdentityChange(e.target.value)}
                className="text-[11px] bg-zinc-800 text-zinc-300 border border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-violet-500"
              >
                {artistIdentities.map((id) => (
                  <option key={id.id} value={id.id}>
                    {id.artistName} {id.isDefault ? "(Default)" : ""}
                  </option>
                ))}
                <option value="custom">+ Other / Custom Name</option>
              </select>
            )}
          </div>
          <Input
            value={artistName}
            onChange={(e) => {
              setArtistName(e.target.value);
              setSelectedIdentityId("custom");
            }}
            placeholder="e.g. Solar Echo"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
            Album / EP (Optional)
          </label>
          <Input
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
            placeholder="e.g. Neon Nights EP"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              BPM (Optional)
            </label>
            <Input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              placeholder="128"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Key (Optional)
            </label>
            <Input
              value={musicalKey}
              onChange={(e) => setMusicalKey(e.target.value)}
              placeholder="F# min"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="explicit"
          checked={explicitContent}
          onChange={(e) => setExplicitContent(e.target.checked)}
          disabled={isSubmitting}
        />
        <label htmlFor="explicit" className="text-xs text-zinc-300 cursor-pointer">
          Explicit lyrics or content
        </label>
      </div>

      {uploadProgress && (
        <div className="flex items-center gap-2 text-xs text-violet-400 bg-violet-950/30 p-3 rounded-md border border-violet-900/50">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{uploadProgress}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={!file || !songName || !artistName}
        >
          Upload Track
        </Button>
      </div>
    </form>
  );
};
