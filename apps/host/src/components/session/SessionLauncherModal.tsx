"use client";

import * as React from "react";
import {
  Dialog,
  Button,
  Input,
  Select,
  FormField,
  Tabs,
} from "@platform/ui";
import { createApiClient } from "@platform/api-client";
import { useHostLiveSession } from "../../providers/HostLiveSessionProvider";
import { Radio, Plus, Key } from "lucide-react";

export interface SessionLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionLauncherModal: React.FC<SessionLauncherModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { setSessionId } = useHostLiveSession();
  const [activeTab, setActiveTab] = React.useState<"NEW" | "EXISTING">("NEW");

  // New session state
  const [stationId, setStationId] = React.useState("station_default");
  const [liveTitle, setLiveTitle] = React.useState(
    "Live Track Review & Underground Discovery",
  );
  const [platform, setPlatform] = React.useState("KICK");
  const [profileUrl, setProfileUrl] = React.useState("https://kick.com/thequeue");

  // Existing session state
  const [existingSessionId, setExistingSessionId] = React.useState("");

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const apiClient = React.useMemo(() => createApiClient(), []);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsLoading(true);
      const res = await apiClient.liveSessions.create({
        stationId,
        liveTitle,
        primaryStreamingPlatform: platform,
        savedProfileUrlSnapshot: profileUrl,
      });

      if (res?.id) {
        setSessionId(res.id);
        onClose();
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(
        errorObj?.message || "Failed to create session. A session may already be active.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingSessionId.trim()) return;
    setSessionId(existingSessionId.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Select or Launch Live Session">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-zinc-800 gap-4 mb-2">
          <button
            type="button"
            onClick={() => setActiveTab("NEW")}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "NEW"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> Launch New Session
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("EXISTING")}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "EXISTING"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Key className="h-3.5 w-3.5" /> Connect via ID
          </button>
        </div>

        {error && (
          <div className="p-3 rounded bg-red-950/50 border border-red-800 text-xs text-red-300">
            {error}
          </div>
        )}

        {activeTab === "NEW" ? (
          <form onSubmit={handleCreateNew} className="space-y-3.5">
            <FormField label="Broadcast Title">
              <Input
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                placeholder="e.g. Friday Night Live Track Review"
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Streaming Platform">
                <Select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="KICK">Kick</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="TWITCH">Twitch</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="FACEBOOK">Facebook</option>
                </Select>
              </FormField>

              <FormField label="Station Identifier">
                <Input
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  placeholder="station_id"
                  required
                />
              </FormField>
            </div>

            <FormField label="Stream Channel / Profile URL">
              <Input
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                placeholder="https://kick.com/yourchannel"
                required
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isLoading}
                className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold"
              >
                <Radio className="mr-1.5 h-4 w-4" /> Start Broadcast Session
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConnectExisting} className="space-y-4">
            <FormField label="Active Session UUID">
              <Input
                value={existingSessionId}
                onChange={(e) => setExistingSessionId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                required
              />
            </FormField>
            <p className="text-xs text-zinc-400">
              Attach the dashboard to an already running session room.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold"
              >
                Connect to Session
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
};
