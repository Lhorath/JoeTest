"use client";

import * as React from "react";
import { Drawer, Button, Checkbox, FormField } from "@platform/ui";
import { useHostLiveSession } from "../../providers/HostLiveSessionProvider";

export interface SessionConfigurationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionConfigurationDrawer: React.FC<
  SessionConfigurationDrawerProps
> = ({ isOpen, onClose }) => {
  const { liveSession, updateConfig } = useHostLiveSession();

  const [submissionsOpen, setSubmissionsOpen] = React.useState<boolean>(true);
  const [freeLineOpen, setFreeLineOpen] = React.useState<boolean>(true);
  const [paidSubmissionsOpen, setPaidSubmissionsOpen] =
    React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (liveSession) {
      setSubmissionsOpen(liveSession.submissionsOpen ?? true);
      setFreeLineOpen(liveSession.freeLineOpen ?? true);
      setPaidSubmissionsOpen(liveSession.paidSubmissionsOpen ?? true);
    }
  }, [liveSession]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateConfig({
        submissionsOpen,
        freeLineOpen,
        paidSubmissionsOpen,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Live Session Settings"
      position="right"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Queue Submission Controls
          </h4>

          {/* Submissions Open Master Toggle */}
          <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 cursor-pointer hover:bg-zinc-900 transition-colors">
            <Checkbox
              checked={submissionsOpen}
              onChange={(e) => setSubmissionsOpen(e.target.checked)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-zinc-100 block">
                Accept Submissions
              </span>
              <p className="text-xs text-zinc-400">
                Master switch for accepting incoming songs into this broadcast.
              </p>
            </div>
          </label>

          {/* Free Line Toggle */}
          <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 cursor-pointer hover:bg-zinc-900 transition-colors">
            <Checkbox
              checked={freeLineOpen}
              disabled={!submissionsOpen}
              onChange={(e) => setFreeLineOpen(e.target.checked)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-zinc-100 block">
                Free Line Open
              </span>
              <p className="text-xs text-zinc-400">
                Allow listeners to submit un-boosted free tracks.
              </p>
            </div>
          </label>

          {/* Priority Line Toggle */}
          <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 cursor-pointer hover:bg-zinc-900 transition-colors">
            <Checkbox
              checked={paidSubmissionsOpen}
              disabled={!submissionsOpen}
              onChange={(e) => setPaidSubmissionsOpen(e.target.checked)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-zinc-100 block">
                Priority Tier Submissions
              </span>
              <p className="text-xs text-zinc-400">
                Allow paid priority jumps and custom tier donations.
              </p>
            </div>
          </label>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
