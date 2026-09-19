"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { api } from "@/lib/api";
import { ThemeTokens, AdminCustomizationConfig, Role } from "@platform/types";
import {
  Palette,
  ArrowLeft,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Radio,
  Image as ImageIcon,
  Eye,
  Sliders,
  Shield,
  Layers,
} from "lucide-react";

const PRESETS: { name: string; tokens: ThemeTokens }[] = [
  {
    name: "Cyber Violet (Default)",
    tokens: {
      primaryColor: "#8B5CF6",
      primaryHoverColor: "#7C3AED",
      secondaryColor: "#27272A",
      accentColor: "#A78BFA",
      backgroundColor: "#09090B",
      surfaceColor: "#18181B",
      textColor: "#FAFAFA",
      mutedTextColor: "#A1A1AA",
      borderColor: "#27272A",
      liveColor: "#EF4444",
      successColor: "#22C55E",
      warningColor: "#F59E0B",
      dangerColor: "#EF4444",
    },
  },
  {
    name: "Midnight Emerald",
    tokens: {
      primaryColor: "#10B981",
      primaryHoverColor: "#059669",
      secondaryColor: "#1E293B",
      accentColor: "#34D399",
      backgroundColor: "#022C22",
      surfaceColor: "#064E3B",
      textColor: "#F8FAFC",
      mutedTextColor: "#94A3B8",
      borderColor: "#065F46",
      liveColor: "#F43F5E",
      successColor: "#10B981",
      warningColor: "#FBBF24",
      dangerColor: "#F43F5E",
    },
  },
  {
    name: "Crimson Pulse",
    tokens: {
      primaryColor: "#E11D48",
      primaryHoverColor: "#BE123C",
      secondaryColor: "#27272A",
      accentColor: "#FB7185",
      backgroundColor: "#09090B",
      surfaceColor: "#18181B",
      textColor: "#FAFAFA",
      mutedTextColor: "#A1A1AA",
      borderColor: "#27272A",
      liveColor: "#E11D48",
      successColor: "#22C55E",
      warningColor: "#F59E0B",
      dangerColor: "#E11D48",
    },
  },
  {
    name: "Electric Blue",
    tokens: {
      primaryColor: "#3B82F6",
      primaryHoverColor: "#2563EB",
      secondaryColor: "#1E293B",
      accentColor: "#60A5FA",
      backgroundColor: "#0B0F17",
      surfaceColor: "#151D2C",
      textColor: "#F8FAFC",
      mutedTextColor: "#94A3B8",
      borderColor: "#1E293B",
      liveColor: "#EF4444",
      successColor: "#22C55E",
      warningColor: "#F59E0B",
      dangerColor: "#EF4444",
    },
  },
];

export default function AdminCustomizationPage() {
  const { user } = useAuth();
  const { refreshTheme, applyPreviewTokens } = useTheme();

  const [siteName, setSiteName] = useState("TheQueue");
  const [primaryLogoUrl, setPrimaryLogoUrl] = useState("");
  const [alternateLogoUrl, setAlternateLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [tokens, setTokens] = useState<ThemeTokens>(PRESETS[0].tokens);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin =
    user?.roles?.includes(Role.OWNER_ADMIN) ||
    user?.roles?.includes(Role.MODERATOR);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.admin.getCustomization();
        if (res) {
          setSiteName(res.siteName || "TheQueue");
          setPrimaryLogoUrl(res.primaryLogoUrl || "");
          setAlternateLogoUrl(res.alternateLogoUrl || "");
          setFaviconUrl(res.faviconUrl || "");
          if (res.tokens) setTokens(res.tokens);
        }
      } catch (err) {
        console.warn("Failed to load admin customization:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleTokenChange = (key: keyof ThemeTokens, val: string) => {
    const updated = { ...tokens, [key]: val };
    setTokens(updated);
    applyPreviewTokens(updated);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setTokens(preset.tokens);
    applyPreviewTokens(preset.tokens);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      await api.admin.updateCustomization({
        siteName,
        primaryLogoUrl: primaryLogoUrl.trim() || undefined,
        alternateLogoUrl: alternateLogoUrl.trim() || undefined,
        faviconUrl: faviconUrl.trim() || undefined,
        tokens,
      });

      await refreshTheme();
      setStatusMessage({ type: "success", text: "Customization & branding tokens saved successfully!" });
    } catch {
      setStatusMessage({ type: "error", text: "Failed to save customization settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset branding and theme tokens to factory defaults?")) {
      return;
    }
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await api.admin.resetCustomization();
      if (res) {
        setSiteName(res.siteName);
        setPrimaryLogoUrl(res.primaryLogoUrl || "");
        setAlternateLogoUrl(res.alternateLogoUrl || "");
        setFaviconUrl(res.faviconUrl || "");
        setTokens(res.tokens);
        await refreshTheme();
        setStatusMessage({ type: "success", text: "Brand settings reset to defaults." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to reset theme customization." });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16 space-y-4">
        <Shield className="h-12 w-12 text-zinc-600 mx-auto" />
        <h2 className="text-xl font-bold text-zinc-200">Administrator Access Required</h2>
        <p className="text-xs text-zinc-400">
          Only administrators may edit platform theme tokens and branding.
        </p>
        <Link
          href="/login?redirect=/admin/customization"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md"
        >
          Sign In as Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/admin" className="hover:text-zinc-200 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Admin Headquarters
        </Link>
        <span>/</span>
        <span className="text-zinc-200 font-medium">Customization & Themes</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Palette className="h-6 w-6 text-violet-400" />
            <span>Theme & Branding Studio</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Dynamically customize site identity, logos, and the 12-token design system palette.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Preset Selector */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span>Curated Color Presets</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/60 hover:border-zinc-700 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: p.tokens.primaryColor }}
                />
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: p.tokens.accentColor }}
                />
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: p.tokens.surfaceColor }}
                />
              </div>
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-violet-300 transition-colors block truncate">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Site Branding Form */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-zinc-100 pb-2 border-b border-zinc-800 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-violet-400" />
              <span>Platform Identity & Branding Assets</span>
            </h2>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                Platform / Site Name *
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="TheQueue"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Primary Brand Logo URL
                </label>
                <input
                  type="url"
                  value={primaryLogoUrl}
                  onChange={(e) => setPrimaryLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.svg"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Favicon Icon URL
                </label>
                <input
                  type="url"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Color Tokens Matrix */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-zinc-100 pb-2 border-b border-zinc-800 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-violet-400" />
              <span>Theme Token Palette (12 Key Variables)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(tokens).map(([key, val]) => (
                <div
                  key={key}
                  className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 block truncate">
                      {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      --color-brand-{key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="color"
                      value={val}
                      onChange={(e) =>
                        handleTokenChange(key as keyof ThemeTokens, e.target.value)
                      }
                      className="h-7 w-7 rounded-lg border-0 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        handleTokenChange(key as keyof ThemeTokens, e.target.value)
                      }
                      className="w-20 bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs font-mono text-zinc-200 text-center uppercase"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className="space-y-4">
          <div className="sticky top-20 rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-bold text-zinc-100">Live Component Preview</h3>
              </div>
              <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Interactive
              </span>
            </div>

            {/* Mock Nav Bar Component */}
            <div
              className="p-3 rounded-xl border flex items-center justify-between transition-colors shadow-inner"
              style={{
                backgroundColor: tokens.surfaceColor,
                borderColor: tokens.borderColor,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: tokens.primaryColor }}
                >
                  <Radio className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold" style={{ color: tokens.textColor }}>
                  {siteName || "TheQueue"}
                </span>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase"
                style={{ backgroundColor: tokens.liveColor }}
              >
                ● 2 LIVE
              </span>
            </div>

            {/* Mock Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 block">
                Primary CTA Buttons
              </span>
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-md transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: tokens.primaryColor }}
              >
                Submit Song to Queue ($5 Priority)
              </button>
              <button
                type="button"
                className="w-full py-2 px-4 rounded-xl font-semibold text-xs transition-colors"
                style={{
                  backgroundColor: tokens.secondaryColor,
                  color: tokens.textColor,
                  border: `1px solid ${tokens.borderColor}`,
                }}
              >
                Join Free Queue
              </button>
            </div>

            {/* Mock Status Badges */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <span className="text-[11px] font-semibold text-zinc-400 block">
                System Status Indicators
              </span>
              <div className="flex flex-wrap gap-2">
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{
                    backgroundColor: `${tokens.successColor}20`,
                    color: tokens.successColor,
                    border: `1px solid ${tokens.successColor}40`,
                  }}
                >
                  Approved & Ready
                </span>
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{
                    backgroundColor: `${tokens.warningColor}20`,
                    color: tokens.warningColor,
                    border: `1px solid ${tokens.warningColor}40`,
                  }}
                >
                  Position #4 On Deck
                </span>
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{
                    backgroundColor: `${tokens.liveColor}20`,
                    color: tokens.liveColor,
                    border: `1px solid ${tokens.liveColor}40`,
                  }}
                >
                  Now Playing On Air
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
