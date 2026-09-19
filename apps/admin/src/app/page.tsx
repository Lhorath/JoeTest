import * as React from "react";
import { Card, Button, Badge } from "@platform/ui";
import {
  Shield,
  Users,
  Landmark,
  Gavel,
  FileText,
  Settings,
  Key,
} from "lucide-react";

export default function AdminPage() {
  return (
    <div className="space-y-10">
      {/* Admin Security Banner */}
      <section className="bg-gradient-to-r from-red-600/10 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-lg p-8 md:p-12 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge
              variant="danger"
              className="px-3 py-1 text-xs uppercase tracking-wider font-bold"
            >
              System Administrator Access
            </Badge>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-100">
              Platform Control HQ
            </h1>
            <p className="text-zinc-400 max-w-xl leading-relaxed text-sm md:text-base">
              Monitor active users, approve or reject host applications, review
              transaction logs, handle chargebacks/refunds, and view system-wide
              cryptographic audit trails.
            </p>
          </div>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-lg shadow-red-500/10"
          >
            <Key className="mr-2 h-4 w-4" /> Security Config
          </Button>
        </div>
      </section>

      {/* Admin Action Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="space-y-4">
          <div className="h-10 w-10 rounded-md bg-red-600/10 flex items-center justify-center text-red-500">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100">
            User & Host Moderation
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Manage global accounts, review incoming applications, execute bans
            and suspensions, and enforce community safety rules.
          </p>
          <div className="pt-4 flex gap-3">
            <Button variant="outline" size="sm">
              Review Applications
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
            >
              Bans (Gavel)
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="h-10 w-10 rounded-md bg-violet-600/10 flex items-center justify-center text-violet-500">
            <Landmark className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100">Financial Ledger</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            View host earnings, monitor transaction fees, reconcile Stripe
            Connect payment logs, execute manual payouts, and process refunds.
          </p>
          <div className="pt-4">
            <Button variant="outline" size="sm" className="w-full">
              Open Financial Ledger
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="h-10 w-10 rounded-md bg-green-600/10 flex items-center justify-center text-green-500">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100">Audit & Log Trail</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Access exhaustive, immutable audit logs containing state changes,
            authentication events, platform config updates, and developer
            requests.
          </p>
          <div className="pt-4">
            <Button variant="outline" size="sm" className="w-full">
              View System Audits
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
