"use client";

import * as React from "react";
import { StationPriorityTier } from "@platform/types";
import { api } from "@/lib/api";
import { Button, Card, Badge, Input } from "@platform/ui";
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  DollarSign,
  Eye,
  EyeOff,
  Palette,
  Info,
} from "lucide-react";

const COLOR_SLOT_OPTIONS = [
  { id: "TIER_COLOR_1", label: "Violet Glow", bg: "bg-violet-950/80 text-violet-300 border-violet-700/80" },
  { id: "TIER_COLOR_2", label: "Amber Gold", bg: "bg-amber-950/80 text-amber-300 border-amber-700/80" },
  { id: "TIER_COLOR_3", label: "Emerald Green", bg: "bg-emerald-950/80 text-emerald-300 border-emerald-700/80" },
  { id: "TIER_COLOR_4", label: "Rose Ruby", bg: "bg-rose-950/80 text-rose-300 border-rose-700/80" },
];

export function HostPriorityTierManager() {
  const [tiers, setTiers] = React.useState<StationPriorityTier[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTierId, setEditingTierId] = React.useState<string | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formPriceDollars, setFormPriceDollars] = React.useState("5.00");
  const [formPriorityRank, setFormPriorityRank] = React.useState(1);
  const [formColorSlot, setFormColorSlot] = React.useState("TIER_COLOR_1");
  const [formIsActive, setFormIsActive] = React.useState(true);
  const [formIsUpgradeEnabled, setFormIsUpgradeEnabled] = React.useState(true);

  const loadTiers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.host.getPriorityTiers();
      setTiers(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load priority tiers");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadTiers();
  }, []);

  const openCreateModal = () => {
    setEditingTierId(null);
    setFormName("");
    setFormDescription("");
    setFormPriceDollars("10.00");
    setFormPriorityRank(tiers.length + 1);
    setFormColorSlot(COLOR_SLOT_OPTIONS[tiers.length % COLOR_SLOT_OPTIONS.length].id);
    setFormIsActive(true);
    setFormIsUpgradeEnabled(true);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tier: StationPriorityTier) => {
    setEditingTierId(tier.id);
    setFormName(tier.name);
    setFormDescription(tier.description || "");
    setFormPriceDollars((tier.priceCents / 100).toFixed(2));
    setFormPriorityRank(tier.priorityRank);
    setFormColorSlot(tier.colorSlot);
    setFormIsActive(tier.isActive);
    setFormIsUpgradeEnabled(tier.isUpgradeEnabled);
    setError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError("Tier name is required");
      return;
    }

    const priceNum = parseFloat(formPriceDollars);
    if (isNaN(priceNum) || priceNum < 1 || priceNum > 1000) {
      setError("Price must be between $1.00 and $1,000.00");
      return;
    }

    const priceCents = Math.round(priceNum * 100);
    setIsSaving(true);
    setError(null);

    try {
      if (editingTierId) {
        await api.host.updatePriorityTier(editingTierId, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          priceCents,
          priorityRank: Number(formPriorityRank),
          colorSlot: formColorSlot,
          isActive: formIsActive,
          isUpgradeEnabled: formIsUpgradeEnabled,
        });
        setSuccessMessage(`Tier "${formName}" updated successfully!`);
      } else {
        await api.host.createPriorityTier({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          priceCents,
          priorityRank: Number(formPriorityRank),
          colorSlot: formColorSlot,
          isActive: formIsActive,
          isUpgradeEnabled: formIsUpgradeEnabled,
        });
        setSuccessMessage(`New Tier "${formName}" created successfully!`);
      }

      setIsModalOpen(false);
      await loadTiers();
    } catch (err: any) {
      setError(err?.message || "Failed to save priority tier");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTier = async (tier: StationPriorityTier) => {
    if (!confirm(`Are you sure you want to delete tier "${tier.name}"?`)) return;

    setError(null);
    try {
      await api.host.deletePriorityTier(tier.id);
      setSuccessMessage(`Tier "${tier.name}" deleted.`);
      await loadTiers();
    } catch (err: any) {
      setError(err?.message || "Failed to delete priority tier");
    }
  };

  const handleToggleActive = async (tier: StationPriorityTier) => {
    setError(null);
    try {
      await api.host.updatePriorityTier(tier.id, {
        isActive: !tier.isActive,
      });
      setSuccessMessage(`Tier "${tier.name}" is now ${!tier.isActive ? "Active" : "Inactive"}.`);
      await loadTiers();
    } catch (err: any) {
      setError(err?.message || "Failed to update tier status");
    }
  };

  const handleMoveTier = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tiers.length) return;

    const newTiers = [...tiers];
    const temp = newTiers[index];
    newTiers[index] = newTiers[targetIndex];
    newTiers[targetIndex] = temp;

    setTiers(newTiers);
    try {
      const tierIds = newTiers.map((t) => t.id);
      await api.host.reorderPriorityTiers({ tierIds });
    } catch (err: any) {
      setError(err?.message || "Failed to reorder tiers");
      await loadTiers();
    }
  };

  const getColorClass = (colorSlot: string) => {
    const found = COLOR_SLOT_OPTIONS.find((c) => c.id === colorSlot);
    return found ? found.bg : "bg-violet-950/80 text-violet-300 border-violet-700/80";
  };

  return (
    <Card className="border-zinc-800 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50">
              Host-Controlled Priority Tiers
            </h2>
            <p className="text-xs text-zinc-400">
              Configure custom paid tiers for your station. Set your own prices, names, colors, and line-jump rankings.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={openCreateModal}
          className="gap-1.5 font-semibold text-xs shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Priority Tier
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-100">Notice</p>
            <p className="text-red-300 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-100">Success</p>
            <p className="text-emerald-300 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 space-x-2 text-zinc-400 text-xs">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          <span>Loading station tiers...</span>
        </div>
      ) : tiers.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl p-6 space-y-3 bg-zinc-900/30">
          <Sparkles className="h-8 w-8 text-zinc-600 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-zinc-200">No Priority Tiers Configured</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Create your first priority tier to allow artists to jump the queue and support your live broadcasts.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            className="gap-1.5 text-xs mx-auto"
          >
            <Plus className="h-3.5 w-3.5" /> Create First Tier
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier, index) => (
            <div
              key={tier.id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                tier.isActive
                  ? "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                  : "border-zinc-850 bg-zinc-950/40 opacity-70"
              }`}
            >
              {/* Left Info */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                {/* Reorder controls */}
                <div className="flex flex-col gap-1 shrink-0 pt-0.5 sm:pt-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveTier(index, "up")}
                    className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move Up in Display Order"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={index === tiers.length - 1}
                    onClick={() => handleMoveTier(index, "down")}
                    className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move Down in Display Order"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold border ${getColorClass(
                        tier.colorSlot,
                      )}`}
                    >
                      <Sparkles className="h-3 w-3" />
                      {tier.name}
                    </span>

                    <span className="text-sm font-extrabold text-zinc-100 font-mono">
                      ${(tier.priceCents / 100).toFixed(2)}
                    </span>

                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      Rank #{tier.priorityRank}
                    </Badge>

                    {tier.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                        <Eye className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500">
                        <EyeOff className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </div>

                  {tier.description && (
                    <p className="text-xs text-zinc-400 line-clamp-1">{tier.description}</p>
                  )}
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(tier)}
                  className="gap-1 text-xs"
                >
                  {tier.isActive ? "Deactivate" : "Activate"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(tier)}
                  className="gap-1 text-xs text-zinc-300 hover:text-zinc-100"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTier(tier)}
                  className="gap-1 text-xs text-zinc-400 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Tier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-50">
                    {editingTierId ? "Edit Priority Tier" : "Create Priority Tier"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Persistent tier settings for your broadcast station
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Tier Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. VIP Fast-Track, Diamond Queue, Gold Review"
                  className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Price (USD $) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-500 text-sm font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.50"
                      min="1.00"
                      max="1000.00"
                      required
                      value={formPriceDollars}
                      onChange={(e) => setFormPriceDollars(e.target.value)}
                      placeholder="15.00"
                      className="w-full h-10 pl-7 pr-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 font-mono focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Priority Line Rank (1 = Top priority)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={formPriorityRank}
                    onChange={(e) => setFormPriorityRank(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Color Badge Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COLOR_SLOT_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormColorSlot(c.id)}
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${c.bg} ${
                        formColorSlot === c.id
                          ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-900"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Description / Perks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe perks included with this tier (e.g. Guaranteed stream critique and playlist consideration)"
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-xs font-semibold text-zinc-200">
                    Tier is Active (Available for submissions)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {editingTierId ? "Save Changes" : "Create Tier"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
