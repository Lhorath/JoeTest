"use client";

import * as React from "react";
import { HostAuthGuard } from "../../components/auth/HostAuthGuard";
import { SessionControlHeader } from "../../components/session/SessionControlHeader";
import { SessionConfigurationDrawer } from "../../components/session/SessionConfigurationDrawer";
import { SessionLauncherModal } from "../../components/session/SessionLauncherModal";
import { PlayerDeck } from "../../components/player/PlayerDeck";
import { LiveQueueTable } from "../../components/queue/LiveQueueTable";
import { useHostLiveSession } from "../../providers/HostLiveSessionProvider";
import { Button } from "@platform/ui";
import { Radio, PlusCircle } from "lucide-react";

export default function HostQueuePage() {
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);
  const [isLauncherOpen, setIsLauncherOpen] = React.useState(false);
  const { sessionId } = useHostLiveSession();

  return (
    <HostAuthGuard>
      <div className="space-y-6">
        {/* Session Header Controller */}
        <SessionControlHeader
          onOpenConfig={() => setIsConfigOpen(true)}
          onOpenLauncher={() => setIsLauncherOpen(true)}
        />

        {sessionId ? (
          <>
            {/* Master DJ Audio Deck */}
            <PlayerDeck />

            {/* Live Interactive Queue Table */}
            <LiveQueueTable />
          </>
        ) : (
          /* No Session Active Prompt */
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-zinc-800 bg-zinc-950/60 shadow-xl space-y-5 my-8">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
              <Radio className="h-8 w-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-black tracking-tight text-zinc-100">
                Ready to Broadcast?
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Launch a live stream session or connect to an existing broadcast
                to arm your DJ deck and start processing live submissions.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsLauncherOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-8 shadow-xl shadow-amber-600/20"
            >
              <PlusCircle className="mr-2 h-5 w-5" /> Launch Stream Broadcast
            </Button>
          </div>
        )}

        {/* Configuration Drawer */}
        <SessionConfigurationDrawer
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
        />

        {/* Session Launcher Modal */}
        <SessionLauncherModal
          isOpen={isLauncherOpen}
          onClose={() => setIsLauncherOpen(false)}
        />
      </div>
    </HostAuthGuard>
  );
}
