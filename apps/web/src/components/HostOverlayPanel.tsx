"use client";

import * as React from "react";
import { Button, Card, Badge } from "@platform/ui";
import { Tv, Copy, Check, ExternalLink, Sparkles, Layers, Sliders } from "lucide-react";

interface HostOverlayPanelProps {
  stationSlug: string;
}

export const HostOverlayPanel: React.FC<HostOverlayPanelProps> = ({ stationSlug }) => {
  const [style, setStyle] = React.useState<"modern" | "compact" | "neon">("modern");
  const [aspect, setAspect] = React.useState<"16:9" | "1:1">("16:9");
  const [copied, setCopied] = React.useState(false);

  const getOverlayUrl = () => {
    if (typeof window === "undefined") return `/overlay/${stationSlug}`;
    return `${window.location.origin}/overlay/${stationSlug}?aspect=${aspect}&style=${style}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getOverlayUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card className="border-zinc-800 p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-950/60 border border-violet-800/60 flex items-center justify-center text-violet-400">
            <Tv className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              OBS Stream Overlays (Browser Source)
            </h2>
            <p className="text-xs text-zinc-400">
              Live "Now Playing" HUD overlay updated directly from your station's real-time queue.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            OBS / Streamlabs / vMix
          </Badge>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-violet-400" /> Overlay Aspect Ratio
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={aspect === "16:9" ? "primary" : "outline"}
              size="sm"
              onClick={() => setAspect("16:9")}
              className="flex-1 text-xs"
            >
              16:9 Lower-Third (Banner)
            </Button>
            <Button
              type="button"
              variant={aspect === "1:1" ? "primary" : "outline"}
              size="sm"
              onClick={() => setAspect("1:1")}
              className="flex-1 text-xs"
            >
              1:1 Square Box
            </Button>
          </div>
          <p className="text-[11px] text-zinc-500">
            {aspect === "16:9"
              ? "Recommended OBS canvas size: Width 700px × Height 140px"
              : "Recommended OBS canvas size: Width 320px × Height 320px"}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-violet-400" /> Visual Theme Style
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={style === "modern" ? "primary" : "outline"}
              size="sm"
              onClick={() => setStyle("modern")}
              className="flex-1 text-xs"
            >
              Modern
            </Button>
            <Button
              type="button"
              variant={style === "compact" ? "primary" : "outline"}
              size="sm"
              onClick={() => setStyle("compact")}
              className="flex-1 text-xs"
            >
              Compact
            </Button>
            <Button
              type="button"
              variant={style === "neon" ? "primary" : "outline"}
              size="sm"
              onClick={() => setStyle("neon")}
              className="flex-1 text-xs"
            >
              Neon
            </Button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Transparent background engineered for clean broadcast compositing.
          </p>
        </div>
      </div>

      {/* Copy URL Row */}
      <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-violet-300 truncate select-all">
              {getOverlayUrl()}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs min-h-[38px]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied Scene URL
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy Browser Source URL
                </>
              )}
            </Button>

            <a
              href={`/overlay/${stationSlug}?aspect=${aspect}&style=${style}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs min-h-[38px]">
                <ExternalLink className="h-3.5 w-3.5" /> Preview
              </Button>
            </a>
          </div>
        </div>

        <div className="border-t border-zinc-900 pt-2 text-[11px] text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-300">OBS Setup Guide:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-zinc-400">
            <li>In OBS Studio, add a new source and select <strong className="text-zinc-200">Browser</strong>.</li>
            <li>Paste your copied Overlay URL above into the <strong className="text-zinc-200">URL</strong> field.</li>
            <li>Set resolution to <strong className="text-zinc-200">{aspect === "16:9" ? "700 x 140" : "320 x 320"}</strong>.</li>
            <li>When you review and play submissions in Studio, the overlay automatically updates with song details, artist identity, and VIP badge!</li>
          </ol>
        </div>
      </div>
    </Card>
  );
};
