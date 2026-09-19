"use client";

import * as React from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import { ProgressBar } from "@platform/ui";

export interface TwoMinuteCountdownProps {
  loadedAt: string | Date | null | undefined;
}

export const TwoMinuteCountdown: React.FC<TwoMinuteCountdownProps> = ({
  loadedAt,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(0);

  React.useEffect(() => {
    if (!loadedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(loadedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [loadedAt]);

  const isQualified = elapsedSeconds >= 120;
  const remainingSeconds = Math.max(0, 120 - elapsedSeconds);
  const percentage = Math.min(100, (elapsedSeconds / 120) * 100);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!loadedAt) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
        <Clock className="h-3.5 w-3.5" />
        <span>Waiting for track to load</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 min-w-[220px]">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="flex items-center gap-1.5 font-sans font-medium text-zinc-400">
          {isQualified ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-amber-400 animate-spin" />
          )}
          2-Min Rule:
        </span>
        <span
          className={
            isQualified ? "text-emerald-400 font-bold" : "text-amber-400"
          }
        >
          {isQualified
            ? "Qualified (History Ready)"
            : `Qualified in ${formatTime(remainingSeconds)}`}
        </span>
      </div>

      <ProgressBar
        value={percentage}
        max={100}
        barClassName={isQualified ? "bg-emerald-500" : "bg-amber-500"}
      />

      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
        <span>Elapsed: {formatTime(elapsedSeconds)}</span>
        <span>Target: 02:00</span>
      </div>
    </div>
  );
};
