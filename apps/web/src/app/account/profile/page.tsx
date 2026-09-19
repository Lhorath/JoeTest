"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { User, ArrowLeft, CheckCircle2, AlertCircle, Save, Globe, Music2 } from "lucide-react";

export default function AccountProfilePage() {
  const { user, updateProfile, isLoading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [country, setCountry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [spotifyProfileUrl, setSpotifyProfileUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl || "");
      setCountry(user.country || "");
      setWebsiteUrl(user.websiteUrl || "");
      setSpotifyProfileUrl(user.spotifyProfileUrl || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setStatusMessage({ type: "error", text: "Display name cannot be empty." });
      return;
    }

    if (
      spotifyProfileUrl.trim() &&
      !spotifyProfileUrl.trim().includes("spotify.com")
    ) {
      setStatusMessage({
        type: "error",
        text: "Please provide a valid Spotify profile URL (e.g., https://open.spotify.com/artist/...)",
      });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        country: country.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        spotifyProfileUrl: spotifyProfileUrl.trim() || undefined,
      });

      setStatusMessage({ type: "success", text: "Profile updated successfully!" });
    } catch {
      setStatusMessage({ type: "error", text: "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 bg-zinc-900 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/account" className="hover:text-zinc-200 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Account Overview
        </Link>
        <span>/</span>
        <span className="text-zinc-200 font-medium">Artist Profile</span>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Edit Artist Profile
        </h1>
        <p className="text-xs text-zinc-400">
          This information is displayed to stream hosts and audience members when your songs play.
        </p>
      </div>

      {/* Multi-Artist Identities Banner */}
      <div className="p-4 rounded-2xl border border-violet-500/30 bg-violet-950/30 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-violet-600/20 text-violet-300 shrink-0 mt-0.5 sm:mt-0">
            <Music2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-zinc-100">
                Unlimited Artist Identities & Spotify Links
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                New
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage multiple artist personas, aliases, or bands with dedicated Spotify URLs and switch between them when submitting songs.
            </p>
          </div>
        </div>
        <Link
          href="/account/artists"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shrink-0 transition-all shadow-md shadow-violet-600/20"
        >
          <span>Manage Identities</span>
          <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
        </Link>
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

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-6"
      >
        {/* Avatar Preview */}
        <div className="flex items-center gap-5 pb-6 border-b border-zinc-800">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold border-2 border-zinc-800 shrink-0 overflow-hidden shadow-inner">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              displayName?.charAt(0).toUpperCase() || "A"
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <label className="text-xs font-semibold text-zinc-300 block">
              Profile Avatar Image URL
            </label>
            <input
              type="url"
              id="profile-avatar-url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
            <p className="text-[11px] text-zinc-500">
              Provide a direct HTTPS link to your profile picture or artwork.
            </p>
          </div>
        </div>

        {/* Primary Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Artist / Display Name *
            </label>
            <input
              type="text"
              id="profile-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Astral Motion"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Account Email (Read-Only)
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl px-3.5 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 block">
            Artist Biography & Background
          </label>
          <textarea
            id="profile-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell host streamers and listeners about your musical style, releases, and journey..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
          />
        </div>

        {/* Spotify Profile URL */}
        <div className="space-y-1.5 p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Music2 className="h-4 w-4 text-emerald-400" />
              Public Spotify Profile Link (Optional)
            </label>
            <span className="text-[10px] text-emerald-500/80 font-medium">
              Adds &quot;Open on Spotify&quot; button in queue
            </span>
          </div>
          <input
            type="url"
            id="profile-spotify-url"
            value={spotifyProfileUrl}
            onChange={(e) => setSpotifyProfileUrl(e.target.value)}
            placeholder="https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
          <p className="text-[11px] text-zinc-400">
            Paste your public Spotify artist or user profile URL. Stream hosts and fans can jump directly to your Spotify discography from your tracks in the live queue.
          </p>
        </div>

        {/* Location & Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Country / Location
            </label>
            <input
              type="text"
              id="profile-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. United States, United Kingdom"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Website / Portfolio Link
            </label>
            <input
              type="url"
              id="profile-website-url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <Link
            href="/account"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            id="profile-save-button"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Changes..." : "Save Profile"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
