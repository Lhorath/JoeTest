"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { LiveDropdown } from "./LiveDropdown";
import {
  Radio,
  User,
  Music,
  ListMusic,
  Shield,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Lock,
  Compass,
} from "lucide-react";
import { Role } from "@platform/types";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { siteName, primaryLogoUrl } = useTheme();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on path change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  const isAdmin =
    user?.roles?.includes(Role.OWNER_ADMIN) ||
    user?.roles?.includes(Role.MODERATOR);

  const isHost = user?.roles?.includes(Role.HOST);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/library", label: "Music Library" },
    { href: "/hosts", label: "Live Stations" },
    { href: "/submissions", label: "Submissions" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Desktop Navigation */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg text-violet-400 hover:text-violet-300 font-sans tracking-wide transition-colors group"
          >
            {primaryLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryLogoUrl}
                alt={siteName}
                className="h-7 w-auto object-contain"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <Radio className="h-4.5 w-4.5" />
              </div>
            )}
            <span className="text-zinc-100 font-bold tracking-tight text-base sm:text-lg">
              {siteName || "TheQueue"}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-zinc-800/80 text-violet-300 font-semibold"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: LIVE Dropdown & Auth Controls */}
        <div className="flex items-center gap-3">
          {/* Live Stations Dropdown Widget */}
          <LiveDropdown />

          {/* User Section */}
          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : isAuthenticated && user ? (
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                id="user-menu-button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-full hover:bg-zinc-900 border border-zinc-800 transition-colors"
                aria-expanded={userDropdownOpen}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    user.displayName?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
                <span className="hidden lg:inline text-xs font-medium text-zinc-200 max-w-[120px] truncate">
                  {user.displayName}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 hidden sm:block ${
                    userDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userDropdownOpen && (
                <div
                  id="user-menu-dropdown"
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-zinc-800/60"
                >
                  <div className="px-4 py-3">
                    <p className="text-xs font-bold text-zinc-100 truncate">
                      {user.displayName}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {isAdmin && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                        {user.accountStatus}
                      </span>
                    </div>
                  </div>

                  <div className="py-1 text-xs text-zinc-300">
                    <Link
                      href="/account"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-800/70 hover:text-violet-300 transition-colors"
                    >
                      <User className="h-4 w-4 text-zinc-400" />
                      <span>Account Profile</span>
                    </Link>
                    <Link
                      href="/account/security"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-800/70 hover:text-violet-300 transition-colors"
                    >
                      <Lock className="h-4 w-4 text-zinc-400" />
                      <span>Security & Sessions</span>
                    </Link>
                    <Link
                      href="/account/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-800/70 hover:text-violet-300 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-zinc-400" />
                      <span>Preferences</span>
                    </Link>
                    <Link
                      href="/library"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-800/70 hover:text-violet-300 transition-colors"
                    >
                      <Music className="h-4 w-4 text-zinc-400" />
                      <span>Music Library</span>
                    </Link>
                    <Link
                      href="/submissions"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-zinc-800/70 hover:text-violet-300 transition-colors"
                    >
                      <ListMusic className="h-4 w-4 text-zinc-400" />
                      <span>My Submissions</span>
                    </Link>
                  </div>

                  <div className="py-1 text-xs">
                    {isHost ? (
                      <Link
                        href="/host/studio"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-amber-400 hover:bg-amber-950/40 hover:text-amber-300 font-semibold transition-colors"
                      >
                        <Radio className="h-4 w-4" />
                        <span>Host Studio & Broadcast</span>
                      </Link>
                    ) : (
                      <Link
                        href="/host/onboarding"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 font-semibold transition-colors"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Become a Broadcaster</span>
                      </Link>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="py-1 text-xs">
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-violet-400 hover:bg-violet-950/40 hover:text-violet-300 font-semibold transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Admin HQ & Approvals</span>
                      </Link>
                    </div>
                  )}

                  <div className="py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors text-left font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-600/30 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 md:hidden transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200">
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-violet-400 font-semibold"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {isAuthenticated && user && (
            <div className="pt-3 border-t border-zinc-800/80 space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Account
              </div>
              <Link
                href="/account"
                className="block px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 rounded-lg"
              >
                Profile & Details
              </Link>
              <Link
                href="/account/security"
                className="block px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 rounded-lg"
              >
                Security & Password
              </Link>
              <Link
                href="/account/settings"
                className="block px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 rounded-lg"
              >
                Preferences
              </Link>
              {isHost ? (
                <Link
                  href="/host/studio"
                  className="block px-3 py-2 text-sm text-amber-400 font-semibold hover:bg-amber-950/40 rounded-lg"
                >
                  Host Studio & Broadcast
                </Link>
              ) : (
                <Link
                  href="/host/onboarding"
                  className="block px-3 py-2 text-sm text-emerald-400 font-semibold hover:bg-emerald-950/40 rounded-lg"
                >
                  Become a Broadcaster
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="block px-3 py-2 text-sm text-violet-400 font-semibold hover:bg-violet-950/40 rounded-lg"
                >
                  Admin Headquarters
                </Link>
              )}
              <button
                type="button"
                onClick={() => logout()}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
