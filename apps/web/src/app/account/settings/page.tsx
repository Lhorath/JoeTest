"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { UserPreferencesDto } from "@platform/types";
import { Settings, ArrowLeft, Bell, Volume2, Moon, CheckCircle2, Save } from "lucide-react";

export default function AccountSettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferencesDto>({
    emailNotifications: true,
    marketingEmails: false,
    soundEffects: true,
    themeMode: "dark",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.account.getPreferences();
        if (res) setPreferences(res);
      } catch (err) {
        console.warn("Failed to load preferences:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const res = await api.account.updatePreferences(preferences);
      if (res) setPreferences(res);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/account" className="hover:text-zinc-200 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Account Overview
        </Link>
        <span>/</span>
        <span className="text-zinc-200 font-medium">Preferences & Audio</span>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Account Preferences
        </h1>
        <p className="text-xs text-zinc-400">
          Customize notifications, audio cues, and display behaviors.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Preferences saved successfully!</span>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-6"
      >
        {/* Notification Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800">
            <Bell className="h-4 w-4 text-violet-400" />
            <h2 className="font-bold text-sm text-zinc-100">Notification Alerts</h2>
          </div>

          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">
                Submission & Queue Status Updates
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                Receive notification alerts when your song gets queued, upgraded, or goes on deck.
              </span>
            </div>
            <input
              type="checkbox"
              id="pref-email-notifications"
              checked={preferences.emailNotifications}
              onChange={(e) =>
                setPreferences({ ...preferences, emailNotifications: e.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
            />
          </label>

          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">
                Platform Announcements & Host Events
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                Updates regarding special host streaming sessions, playlist features, and platform updates.
              </span>
            </div>
            <input
              type="checkbox"
              id="pref-marketing-emails"
              checked={preferences.marketingEmails}
              onChange={(e) =>
                setPreferences({ ...preferences, marketingEmails: e.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
            />
          </label>
        </div>

        {/* Audio Effects */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800">
            <Volume2 className="h-4 w-4 text-violet-400" />
            <h2 className="font-bold text-sm text-zinc-100">Audio Feedback & Sound Effects</h2>
          </div>

          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">
                Queue & Playback Sound Effects
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                Play subtle chimes and status transitions when entering or advancing through queues.
              </span>
            </div>
            <input
              type="checkbox"
              id="pref-sound-effects"
              checked={preferences.soundEffects}
              onChange={(e) =>
                setPreferences({ ...preferences, soundEffects: e.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
            />
          </label>
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
            id="settings-save-button"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Preferences"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
