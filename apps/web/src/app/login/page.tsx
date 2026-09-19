"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Radio, Lock, Mail, Eye, EyeOff, ArrowRight, Shield, Sparkles, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const { login } = useAuth();
  const { siteName } = useTheme();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please enter your email/username and password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await login({ emailOrUsername: identifier, password });
      if (res.success) {
        router.push(redirectUrl);
      } else {
        setError(res.message || "Invalid email or password.");
      }
    } catch {
      setError("An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 items-center justify-center text-white shadow-lg shadow-violet-500/25 mb-2">
            <Radio className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Welcome back to {siteName || "TheQueue"}
          </h1>
          <p className="text-sm text-zinc-400">
            Sign in to submit songs, track queue positions, and manage your artist library.
          </p>
        </div>

        {/* Quick Demo Access Bar */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Instant Quick-Fill Credentials:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("artist@thequeue.live", "DemoPassword123!")}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-left transition-colors"
            >
              <span className="block font-semibold text-violet-400">Demo Artist</span>
              <span className="text-[10px] text-zinc-400 truncate block">artist@thequeue.live</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("admin@thequeue.live", "AdminMasterKey2026!")}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-left transition-colors"
            >
              <span className="block font-semibold text-violet-400 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Admin HQ
              </span>
              <span className="text-[10px] text-zinc-400 truncate block">admin@thequeue.live</span>
            </button>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                Email or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="login-identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. artist@thequeue.live or demoartist"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 pr-10 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-button"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white shadow-md shadow-violet-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-400">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/register"
                className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
