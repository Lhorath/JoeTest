"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Music2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { TERMS_METADATA } from "@platform/config";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { siteName } = useTheme();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Check all required fields
    if (!email || !username || !displayName || !password || !confirmPassword) {
      setError("Please fill out all registration fields.");
      return;
    }

    // 2. Terms acceptance check
    if (!acceptTerms) {
      setError(
        "You must agree to the Terms of Service and acknowledge the Privacy Policy to create an account.",
      );
      return;
    }

    // 3. Client-side password equality check
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // 4. Client-side password length check
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await register({
        email,
        username,
        displayName,
        password,
        passwordConfirmation: confirmPassword,
        acceptTerms: true,
        termsVersion: TERMS_METADATA.version,
      });

      if (res.success) {
        // Auto-login succeeds: redirect directly to account dashboard
        router.push("/account");
      } else {
        setError(res.message || "Failed to create account.");
      }
    } catch {
      setError("An unexpected error occurred during account creation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 items-center justify-center text-white shadow-lg shadow-violet-500/25 mb-2">
            <Music2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Create your {siteName || "TheQueue"} Account
          </h1>
          <p className="text-sm text-zinc-400">
            Join independent artists submitting music to live streamers and hosts.
          </p>
        </div>

        {/* Registration Form Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                id="register-error-message"
                role="alert"
                className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="register-email"
                className="text-xs font-semibold text-zinc-300 block"
              >
                Email Address
              </label>
              <input
                type="email"
                id="register-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="producer@example.com"
                autoComplete="email"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-username"
                className="text-xs font-semibold text-zinc-300 block"
              >
                Username
              </label>
              <input
                type="text"
                id="register-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. cyber_producer"
                autoComplete="username"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-displayname"
                className="text-xs font-semibold text-zinc-300 block"
              >
                Artist / Display Name
              </label>
              <input
                type="text"
                id="register-displayname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Astral Motion"
                autoComplete="name"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-password"
                className="text-xs font-semibold text-zinc-300 block"
              >
                Password (min 8 characters)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="register-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 pr-10 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-confirm-password"
                className="text-xs font-semibold text-zinc-300 block"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="register-confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 pr-10 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms of Service & Privacy Policy Agreement */}
            <div className="pt-1">
              <label
                htmlFor="register-accept-terms"
                className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-400 select-none group"
              >
                <input
                  type="checkbox"
                  id="register-accept-terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500 focus:ring-offset-zinc-900 transition-colors cursor-pointer"
                  required
                />
                <span className="leading-relaxed">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="font-medium text-violet-400 hover:text-violet-300 underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and acknowledge the{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="font-medium text-violet-400 hover:text-violet-300 underline"
                  >
                    Privacy Policy
                  </Link>
                  . I confirm that I own or hold all required rights to the music I submit.
                </span>
              </label>
            </div>

            <button
              type="submit"
              id="register-submit-button"
              disabled={loading || !acceptTerms}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white shadow-md shadow-violet-600/30 flex items-center justify-center gap-2 transition-all min-h-[44px]"
            >
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Create Artist Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
