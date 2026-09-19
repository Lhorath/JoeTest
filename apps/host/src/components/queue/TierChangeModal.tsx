"use client";

import * as React from "react";
import { Dialog, Button, Select, FormField } from "@platform/ui";
import { LiveQueueEntry } from "../../providers/HostLiveSessionProvider";

export interface TierChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LiveQueueEntry | null;
  onConfirm: (
    destinationType: "FREE" | "PRIORITY_TIER",
    tierSnapshotId?: string,
  ) => Promise<void>;
}

export const TierChangeModal: React.FC<TierChangeModalProps> = ({
  isOpen,
  onClose,
  entry,
  onConfirm,
}) => {
  const [destinationType, setDestinationType] = React.useState<
    "FREE" | "PRIORITY_TIER"
  >("FREE");
  const [tierSnapshotId, setTierSnapshotId] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (entry) {
      if (entry.submission.isPriority) {
        setDestinationType("FREE");
      } else {
        setDestinationType("PRIORITY_TIER");
      }
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onConfirm(
        destinationType,
        destinationType === "PRIORITY_TIER" ? tierSnapshotId || undefined : undefined,
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!entry) return null;

  const currentIsPriority = entry.submission.isPriority;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Change Queue Entry Tier">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-1">
          <p className="font-bold text-zinc-100">
            {entry.submission.songName || "Track"} —{" "}
            {entry.submission.artistName || "Artist"}
          </p>
          <p className="text-zinc-400">
            Currently in:{" "}
            <span className="font-semibold text-amber-400">
              {currentIsPriority ? "Priority Tier" : "Free Line"}
            </span>
          </p>
        </div>

        <FormField label="Select Target Placement Tier">
          <Select
            value={destinationType}
            onChange={(e) =>
              setDestinationType(e.target.value as "FREE" | "PRIORITY_TIER")
            }
          >
            <option value="FREE">Free Line (Standard Queue)</option>
            <option value="PRIORITY_TIER">
              Priority Tier (Host Promoted)
            </option>
          </Select>
        </FormField>

        <p className="text-xs text-zinc-500 leading-relaxed">
          Promoting or demoting an entry updates the backend queue placement
          and preserves original submission timestamps for fairness.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold"
          >
            Apply Tier Change
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
