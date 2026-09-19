"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import { ArtistIdentitySummary, CreateArtistIdentityDto, UpdateArtistIdentityDto } from "@platform/types";
import { validateSpotifyUrl } from "@platform/validation";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Star,
  Music2,
  X,
  Loader2,
  Info,
} from "lucide-react";

function SpotifyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308c-.215.353-.676.467-1.029.252-2.824-1.725-6.379-2.115-10.567-1.158-.403.092-.808-.16-.9-.562-.093-.404.159-.808.562-.901 4.585-1.048 8.52-.607 11.682 1.34.353.216.467.676.252 1.029zm1.47-3.262c-.27.44-.848.58-1.288.31-3.232-1.986-8.159-2.56-11.982-1.398-.497.151-1.03-.131-1.181-.628-.152-.497.131-1.03.628-1.181 4.372-1.327 9.803-.687 13.513 1.609.44.27.58.848.31 1.288zm.126-3.41c-3.876-2.302-10.27-2.514-13.985-1.386-.594.18-1.226-.154-1.407-.748-.18-.593.154-1.226.748-1.407 4.273-1.298 11.332-1.05 15.794 1.598.534.317.708 1.01.391 1.544-.318.533-1.011.708-1.541.399z" />
    </svg>
  );
}

export default function AccountArtistsPage() {
  const { user } = useAuth();
  const [identities, setIdentities] = useState<ArtistIdentitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdentity, setEditingIdentity] = useState<ArtistIdentitySummary | null>(null);
  const [formArtistName, setFormArtistName] = useState("");
  const [formSpotifyUrl, setFormSpotifyUrl] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation State
  const [deletingIdentity, setDeletingIdentity] = useState<ArtistIdentitySummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchIdentities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.artists.list();
      setIdentities(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load artist identities.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIdentities();
  }, []);

  const openCreateModal = () => {
    setEditingIdentity(null);
    setFormArtistName("");
    setFormSpotifyUrl("");
    setFormBio("");
    setFormIsDefault(identities.length === 0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (identity: ArtistIdentitySummary) => {
    setEditingIdentity(identity);
    setFormArtistName(identity.artistName);
    setFormSpotifyUrl(identity.spotifyUrl || "");
    setFormBio(identity.biography || "");
    setFormIsDefault(Boolean(identity.isDefault));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSpotifyUrlChange = (val: string) => {
    setFormSpotifyUrl(val);
    if (val.trim()) {
      const check = validateSpotifyUrl(val);
      if (!check.valid) {
        setFormError(check.error || "Invalid Spotify URL");
      } else {
        setFormError(null);
      }
    } else {
      setFormError(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formArtistName.trim()) {
      setFormError("Artist name is required.");
      return;
    }

    if (formSpotifyUrl.trim()) {
      const check = validateSpotifyUrl(formSpotifyUrl);
      if (!check.valid) {
        setFormError(check.error || "Please provide a valid open.spotify.com artist profile link.");
        return;
      }
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingIdentity) {
        const updatePayload: UpdateArtistIdentityDto = {
          artistName: formArtistName.trim(),
          spotifyUrl: formSpotifyUrl.trim() || undefined,
          biography: formBio.trim() || undefined,
          isDefault: formIsDefault,
        };
        await api.artists.update(editingIdentity.id, updatePayload);
        setStatusMessage({ type: "success", text: `Updated artist "${formArtistName.trim()}" successfully.` });
      } else {
        const createPayload: CreateArtistIdentityDto = {
          artistName: formArtistName.trim(),
          spotifyUrl: formSpotifyUrl.trim() || undefined,
          biography: formBio.trim() || undefined,
          isDefault: formIsDefault,
        };
        await api.artists.create(createPayload);
        setStatusMessage({ type: "success", text: `Created new artist identity "${formArtistName.trim()}".` });
      }

      setIsModalOpen(false);
      await fetchIdentities();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save artist identity.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingIdentity) return;
    setIsDeleting(true);
    try {
      await api.artists.delete(deletingIdentity.id);
      setStatusMessage({
        type: "success",
        text: `Artist "${deletingIdentity.artistName}" was deleted. Past submissions and historical tracks maintain attribution.`,
      });
      setDeletingIdentity(null);
      await fetchIdentities();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Failed to delete artist identity." });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (identity: ArtistIdentitySummary) => {
    try {
      await api.artists.update(identity.id, { isDefault: true });
      setStatusMessage({ type: "success", text: `Set "${identity.artistName}" as your default artist identity.` });
      await fetchIdentities();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Failed to set default artist." });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href="/account" className="hover:text-zinc-200 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Account Overview
        </Link>
        <span>/</span>
        <span className="text-zinc-200 font-medium">Artist Identities</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Music2 className="h-6 w-6 text-violet-400" />
            Artist Identities & Spotify Profiles
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Manage unlimited artist personas, side projects, and labels. Attach verified Spotify artist URLs to show direct links during live stream reviews.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          id="create-artist-identity-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all self-start sm:self-auto shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Artist Identity</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            statusMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-zinc-200 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-zinc-900 rounded-2xl" />
          <div className="h-28 bg-zinc-900 rounded-2xl" />
        </div>
      ) : identities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto">
            <Music2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-100">No Artist Identities Yet</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Create your first artist identity to automatically link your stage name and Spotify profile to your track uploads and live queue submissions.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Artist</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {identities.map((identity) => (
            <div
              key={identity.id}
              className={`rounded-2xl border transition-all p-5 bg-zinc-900/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                identity.isDefault
                  ? "border-violet-500/50 shadow-lg shadow-violet-950/20"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-base font-bold shrink-0 border border-violet-400/30 shadow-md">
                  {identity.profileImageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={identity.profileImageKey}
                      alt={identity.artistName}
                      className="h-full w-full object-cover rounded-xl"
                    />
                  ) : (
                    identity.artistName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-zinc-100 truncate">
                      {identity.artistName}
                    </h3>
                    {identity.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40">
                        <Star className="h-3 w-3 fill-violet-300" /> Default Artist
                      </span>
                    )}
                  </div>

                  {identity.biography && (
                    <p className="text-xs text-zinc-400 line-clamp-1">
                      {identity.biography}
                    </p>
                  )}

                  {/* Spotify Profile Integration */}
                  <div className="pt-1 flex items-center gap-3 flex-wrap">
                    {identity.spotifyUrl ? (
                      <a
                        href={identity.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954] text-xs font-semibold transition-colors"
                        title={identity.spotifyUrl}
                      >
                        <SpotifyIcon className="h-3.5 w-3.5 text-[#1DB954]" />
                        <span>Spotify Profile</span>
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-zinc-500 italic">
                        No Spotify link attached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60 w-full sm:w-auto justify-end">
                {!identity.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(identity)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                    title="Set as Default for new submissions"
                  >
                    Make Default
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openEditModal(identity)}
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
                  title="Edit Artist Identity"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingIdentity(identity)}
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                  title="Delete Artist Identity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card on Unlimited Identities & Security */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2 text-zinc-300 font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Multi-Artist Identity Features</span>
        </div>
        <p className="leading-relaxed">
          • You have unlimited artist identities for solo work, duo projects, and separate genres.
          <br />
          • Each identity can optionally link to its own verified Spotify artist page.
          <br />
          • During track submission, you can choose any identity or submit as &ldquo;No Artist&rdquo;.
          <br />
          • Deleting an identity never breaks past broadcast submissions, track play logs, or review history.
        </p>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">
                {editingIdentity ? "Edit Artist Identity" : "Create New Artist Identity"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Artist / Stage Name *
                </label>
                <input
                  type="text"
                  value={formArtistName}
                  onChange={(e) => setFormArtistName(e.target.value)}
                  placeholder="e.g. Solar Echo"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <SpotifyIcon className="h-3.5 w-3.5 text-[#1DB954]" />
                    <span>Spotify Profile URL (Optional)</span>
                  </label>
                  {formSpotifyUrl && validateSpotifyUrl(formSpotifyUrl).valid && (
                    <span className="text-[11px] text-[#1DB954] flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Validated
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  value={formSpotifyUrl}
                  onChange={(e) => handleSpotifyUrlChange(e.target.value)}
                  placeholder="https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/50 focus:border-[#1DB954]"
                />
                <p className="text-[11px] text-zinc-500">
                  Must be an official Spotify URL (e.g. <code className="text-zinc-400">https://open.spotify.com/artist/...</code> or <code className="text-zinc-400">spotify:artist:...</code>).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Artist Biography (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="Genre style, instruments, releases, background..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="form-is-default"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="form-is-default" className="text-xs text-zinc-300 font-medium cursor-pointer">
                  Set as my default artist identity for submissions
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-violet-600/30 transition-all"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingIdentity ? "Save Changes" : "Create Artist"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingIdentity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-zinc-100">
                Delete Artist Identity?
              </h2>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete &ldquo;<strong className="text-zinc-200">{deletingIdentity.artistName}</strong>&rdquo;?
              <br />
              <br />
              <strong className="text-zinc-300">Historical Data Preserved:</strong> Past queue entries, payment records, and broadcast logs will safely keep their artist attribution.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeletingIdentity(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-red-600/30 transition-all"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Identity</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
