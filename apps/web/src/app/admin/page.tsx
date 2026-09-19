"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { Role } from "@platform/types";
import {
  Shield,
  Palette,
  Users,
  Radio,
  Music,
  CreditCard,
  History,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();

  const isAdmin =
    user?.roles?.includes(Role.OWNER_ADMIN) ||
    user?.roles?.includes(Role.MODERATOR);

  if (isLoading) {
    return <div className="h-64 bg-zinc-900 rounded-2xl animate-pulse" />;
  }

  if (!user || !isAdmin) {
    return (
      <div className="text-center py-16 space-y-4">
        <Shield className="h-12 w-12 text-zinc-600 mx-auto" />
        <h2 className="text-xl font-bold text-zinc-200">Administrator Access Required</h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          You need an account with OWNER_ADMIN or MODERATOR roles to access the System Administration Headquarters.
        </p>
        <Link
          href="/login?redirect=/admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all"
        >
          Sign In with Admin Account
        </Link>
      </div>
    );
  }

  const adminModules = [
    {
      title: "Host Applications & Approvals",
      description: "Review broadcaster applications, verify Stripe Connect payout status, toggle manual approval policies, and manage host stations.",
      href: "/admin/hosts",
      icon: Radio,
      badge: "Broadcasters",
      color: "from-amber-600 to-orange-600",
    },
    {
      title: "Global Theme & Customization",
      description: "Manage platform branding, logos, site name, 12-token color palettes, and live visual preview.",
      href: "/admin/customization",
      icon: Palette,
      badge: "Live Theming",
      color: "from-violet-600 to-indigo-600",
    },
    {
      title: "Live Station Directory",
      description: "Monitor active host streams, inspect queue states, and explore broadcaster vanity stations.",
      href: "/hosts",
      icon: Radio,
      badge: "Stations",
      color: "from-red-600 to-rose-600",
    },
    {
      title: "Music Submissions & Catalog",
      description: "Inspect user audio library uploads, track validation status, and stream queue submissions.",
      href: "/library",
      icon: Music,
      badge: "Audio Processing",
      color: "from-emerald-600 to-teal-600",
    },
    {
      title: "Security & Access Control",
      description: "Inspect active admin sessions, audit logs, authentication records, and system emergency controls.",
      href: "/account/security",
      icon: Shield,
      badge: "RBAC & Audits",
      color: "from-blue-600 to-cyan-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-violet-900/50 bg-gradient-to-r from-violet-950/40 via-zinc-900 to-zinc-950 p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                OWNER_ADMIN HQ
              </span>
              <span className="text-xs text-zinc-400">
                Logged in as <span className="text-zinc-200 font-semibold">{user.displayName}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              Platform Administration & Control Center
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Configure system themes, manage branding tokens, inspect live broadcasts, and control platform settings.
            </p>
          </div>

          <Link
            href="/admin/customization"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all shrink-0"
          >
            <Palette className="h-4 w-4" />
            <span>Theme Studio</span>
          </Link>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {adminModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.title}
              href={module.href}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900 hover:border-zinc-700 p-6 space-y-4 transition-all group shadow-md"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`h-11 w-11 rounded-xl bg-gradient-to-tr ${module.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}
                >
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                  {module.badge}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100 group-hover:text-violet-300 transition-colors">
                  {module.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {module.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 group-hover:text-violet-300 transition-colors pt-1">
                <span>Access Module</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
