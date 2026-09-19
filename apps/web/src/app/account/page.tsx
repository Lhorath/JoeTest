"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import {
  User,
  Shield,
  Lock,
  Settings,
  Music,
  ListMusic,
  ExternalLink,
  Mail,
  CheckCircle2,
  Calendar,
  Globe,
  Radio,
  Sparkles,
} from "lucide-react";
import { Badge } from "@platform/ui";
import { Role } from "@platform/types";

export default function AccountOverviewPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-zinc-900 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-40 bg-zinc-900 rounded-xl" />
          <div className="h-40 bg-zinc-900 rounded-xl" />
          <div className="h-40 bg-zinc-900 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 space-y-4">
        <User className="h-12 w-12 text-zinc-600 mx-auto" />
        <h2 className="text-xl font-bold text-zinc-200">Account Access Required</h2>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          Please sign in to view your profile, manage submissions, and adjust settings.
        </p>
        <Link
          href="/login?redirect=/account"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  const isAdmin =
    user.roles?.includes(Role.OWNER_ADMIN) ||
    user.roles?.includes(Role.MODERATOR);

  return (
    <div className="space-y-8">
      {/* Profile Header Banner */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-500/20 border-2 border-zinc-800 shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                user.displayName?.charAt(0).toUpperCase() || "A"
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
                  {user.displayName}
                </h1>
                {isAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Administrator
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                  @{user.username}
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-zinc-500" />
                <span>{user.email}</span>
                {user.emailVerified ? (
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <Link
                    href="/verify-email"
                    className="text-amber-400 underline hover:text-amber-300 text-[11px]"
                  >
                    Verify email
                  </Link>
                )}
              </p>
              {user.bio && (
                <p className="text-xs text-zinc-300 max-w-xl pt-1">
                  {user.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:self-center">
            <Link
              href="/account/profile"
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
            >
              Edit Profile
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all flex items-center gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" />
                Admin Studio
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Account Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Artist Identities Card */}
        <Link
          href="/account/artists"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-violet-500/50 p-5 space-y-3 transition-all group"
        >
          <div className="h-10 w-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Music className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-100 group-hover:text-violet-400 transition-colors">
              Artist Identities
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Create unlimited artist personas, side projects, and connect verified Spotify URLs.
            </p>
          </div>
          <div className="text-[11px] font-semibold text-violet-400 flex items-center gap-1 pt-1">
            Manage artists →
          </div>
        </Link>

        {/* Profile Card */}
        <Link
          href="/account/profile"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700/80 p-5 space-y-3 transition-all group"
        >
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-100 group-hover:text-indigo-400 transition-colors">
              Account Profile
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Customize your account display name, bio, profile avatar, and user information.
            </p>
          </div>
          <div className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1 pt-1">
            Manage profile →
          </div>
        </Link>

        {/* Security & Sessions Card */}
        <Link
          href="/account/security"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700/80 p-5 space-y-3 transition-all group"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition-colors">
              Security & Sessions
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Change password, monitor active browser sessions, and inspect security logs.
            </p>
          </div>
          <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 pt-1">
            Security settings →
          </div>
        </Link>

        {/* Preferences & Settings Card */}
        <Link
          href="/account/settings"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700/80 p-5 space-y-3 transition-all group"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors">
              Preferences & Audio
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Configure submission alerts, email digests, interface audio cues, and display.
            </p>
          </div>
          <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 pt-1">
            Configure preferences →
          </div>
        </Link>
      </div>

      {/* Quick Artist Shortcuts */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <h3 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span>Quick Artist Actions</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/library"
            className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Music className="h-5 w-5 text-violet-400" />
              <div>
                <div className="font-semibold text-xs text-zinc-100">Upload & Manage Tracks</div>
                <div className="text-[11px] text-zinc-500">Ready audio files for queue submissions</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-violet-400">Library →</span>
          </Link>
          <Link
            href="/submissions"
            className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ListMusic className="h-5 w-5 text-emerald-400" />
              <div>
                <div className="font-semibold text-xs text-zinc-100">Track Submissions & Queue</div>
                <div className="text-[11px] text-zinc-500">Live positions, priority status & feedback</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400">Submissions →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
