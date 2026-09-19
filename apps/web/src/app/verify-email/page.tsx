"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const { verifyEmail, user } = useAuth();
  const [token, setToken] = useState(tokenParam);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tokenParam) {
      handleVerify(tokenParam);
    }
  }, [tokenParam]);

  const handleVerify = async (code: string) => {
    if (!code) return;
    setError(null);
    setLoading(true);

    try {
      const res = await verifyEmail(code);
      if (res.success) {
        setVerified(true);
      } else {
        setError(res.message || "Invalid or expired verification token.");
      }
    } catch {
      setError("Failed to verify email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-zinc-800 border border-zinc-700 items-center justify-center text-violet-400 mb-2">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Email Verification
          </h1>
          <p className="text-sm text-zinc-400">
            Verify your email address to unlock unrestricted music queue submissions.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
          {verified || user?.emailVerified ? (
            <div className="text-center space-y-4 py-2">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-zinc-100">Email Successfully Verified!</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Your artist account is verified and ready for live stream submissions.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/library"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all"
                >
                  Go to Music Library
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Verification Code / Token
                </label>
                <input
                  type="text"
                  id="verify-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter the 6-digit code or verification token"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                />
              </div>

              <button
                type="button"
                id="verify-submit-button"
                onClick={() => handleVerify(token || "DEMO-VERIFY-CODE")}
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white shadow-md shadow-violet-600/30 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verify Email Now</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
