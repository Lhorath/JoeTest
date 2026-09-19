"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import { UserSessionInfo, SecurityEventLog } from "@platform/types";
import {
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Laptop,
  Shield,
  Trash2,
  LogOut,
  Activity,
  History,
} from "lucide-react";

export default function AccountSecurityPage() {
  const { changePassword, logout } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<UserSessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Security logs state
  const [logs, setLogs] = useState<SecurityEventLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await api.account.getSessions();
      setSessions(res || []);
    } catch (err) {
      console.warn("Failed to fetch sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await api.account.getSecurityLogs();
      setLogs(res || []);
    } catch (err) {
      console.warn("Failed to fetch security logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchLogs();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordStatus({ type: "error", text: "Please enter a new password." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", text: "New passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    setPasswordStatus(null);

    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.success) {
        setPasswordStatus({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        fetchLogs();
      } else {
        setPasswordStatus({ type: "error", text: res.message || "Failed to change password." });
      }
    } catch {
      setPasswordStatus({ type: "error", text: "An error occurred while updating password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.account.revokeSession(sessionId);
      fetchSessions();
      fetchLogs();
    } catch (err) {
      console.error("Failed to revoke session:", err);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm("Are you sure you want to sign out of all sessions? You will need to log in again.")) {
      return;
    }
    try {
      await api.account.logoutAll();
      await logout();
    } catch (err) {
      console.error("Failed to logout all:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/account" className="hover:text-zinc-200 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Account Overview
        </Link>
        <span>/</span>
        <span className="text-zinc-200 font-medium">Security & Sessions</span>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Security & Active Sessions
        </h1>
        <p className="text-xs text-zinc-400">
          Manage your account credentials, monitor active devices, and review recent security events.
        </p>
      </div>

      {/* 1. Change Password Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
          <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <KeyRound className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-zinc-100">Change Password</h2>
            <p className="text-[11px] text-zinc-400">
              Ensure your account is protected with a secure password.
            </p>
          </div>
        </div>

        {passwordStatus && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              passwordStatus.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {passwordStatus.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{passwordStatus.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Current Password
            </label>
            <input
              type="password"
              id="security-current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              New Password (min 8 characters) *
            </label>
            <input
              type="password"
              id="security-new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Confirm New Password *
            </label>
            <input
              type="password"
              id="security-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              required
            />
          </div>

          <button
            type="submit"
            id="change-password-button"
            disabled={passwordLoading}
            className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-zinc-950 font-bold text-xs shadow-md shadow-amber-600/20 transition-all"
          >
            {passwordLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* 2. Active Sessions Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
              <Laptop className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-zinc-100">Active Devices & Sessions</h2>
              <p className="text-[11px] text-zinc-400">
                Browsers and clients currently authenticated to your account.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogoutAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold transition-colors self-start sm:self-center"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out of all devices</span>
          </button>
        </div>

        <div className="space-y-3">
          {sessionsLoading ? (
            <div className="h-20 bg-zinc-950 rounded-xl animate-pulse" />
          ) : sessions.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2">No active sessions found.</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/60"
              >
                <div className="flex items-center gap-3">
                  <Laptop className="h-5 w-5 text-zinc-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">
                        {session.userAgent || "Web Browser"}
                      </span>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Current Device
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 flex flex-wrap gap-2">
                      <span>IP: {session.ipAddress || "127.0.0.1"}</span>
                      <span>•</span>
                      <span>
                        Last active: {new Date(session.lastSeenAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(session.id)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Revoke session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Security Activity Logs */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <History className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-zinc-100">Security Audit Events</h2>
            <p className="text-[11px] text-zinc-400">
              Audit log of authentication and authorization events for this account.
            </p>
          </div>
        </div>

        <div className="divide-y divide-zinc-800/60 text-xs">
          {logsLoading ? (
            <div className="h-20 bg-zinc-950 rounded-xl animate-pulse" />
          ) : logs.length === 0 ? (
            <p className="text-zinc-500 py-3">No security events recorded yet.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4 text-violet-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-zinc-300 font-mono">
                      {log.eventType}
                    </span>
                    <span className="text-zinc-500 text-[11px] block">
                      IP: {log.ipAddress || "127.0.0.1"} • {log.userAgent || "Web Browser"}
                    </span>
                  </div>
                </div>
                <span className="text-zinc-500 text-[11px] shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
