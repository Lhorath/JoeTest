"use client";

import * as React from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Eye,
  Database,
  UserCheck,
  Server,
  FileText,
  ChevronRight,
  Printer,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button, Badge } from "@platform/ui";
import { PRIVACY_METADATA, getLegalConfig } from "@platform/config";

export default function PrivacyPolicyPage() {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const legalConfig = getLegalConfig();

  const copyPageUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const sections = [
    {
      id: "info-we-collect",
      title: "1. Information We Collect",
      icon: Database,
      content: (
        <div className="space-y-3 text-zinc-300 text-sm leading-relaxed">
          <p>
            When you register, upload tracks, submit music, or host a station on TheQueue, we collect several categories of information:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
            <li><strong className="text-zinc-300">Account Credentials & Profile:</strong> Email address, username, display name, password hash, avatar images, biography, and country location.</li>
            <li><strong className="text-zinc-300">Music Library & Audio Files:</strong> Uploaded audio recordings, track titles, album names, durations, BPM, musical keys, and associated metadata.</li>
            <li><strong className="text-zinc-300">Transaction & Payout Identifiers:</strong> Stripe Customer IDs, Payment Intent status codes, and Stripe Connect Account IDs. We do not store raw credit card numbers on our servers.</li>
            <li><strong className="text-zinc-300">Queue & Playback Telemetry:</strong> Submission timestamps, queue positions, priority rank selections, and review statuses.</li>
            <li><strong className="text-zinc-300">Technical Log Data:</strong> IP addresses, browser user agent strings, and security event logs for fraud prevention.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-we-use",
      title: "2. How We Use Your Information",
      icon: Eye,
      content: (
        <div className="space-y-3 text-zinc-300 text-sm leading-relaxed">
          <p>We process your data for the following legitimate purposes:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
            <li>Operating the music submission, real-time queue ordering, and live audio playback systems.</li>
            <li>Facilitating host broadcaster review workflows and voluntary priority queue processing.</li>
            <li>Authenticating user sessions and safeguarding account security.</li>
            <li>Routing payments and automated host revenue splits via Stripe Connect.</li>
            <li>Enforcing our Terms of Service and preventing bot spam or copyright abuse.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sharing",
      title: "3. Information Sharing & Third Parties",
      icon: Server,
      content: (
        <div className="space-y-3 text-zinc-300 text-sm leading-relaxed">
          <p>
            We do not sell, rent, or monetize your personal data. We share information only with:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-400">
            <li><strong className="text-zinc-300">Hosts / Broadcasters:</strong> When you submit a track to a station, your artist display name, song title, and audio stream are transmitted to the host for livestream evaluation.</li>
            <li><strong className="text-zinc-300">Stripe:</strong> Payment and payout processing is handled securely by Stripe under their privacy policy.</li>
            <li><strong className="text-zinc-300">Legal Compliance:</strong> When required by valid law, subpoena, or to protect against copyright infringement or fraud.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "data-rights",
      title: "4. Your Data Rights & Retention",
      icon: UserCheck,
      content: (
        <div className="space-y-3 text-zinc-300 text-sm leading-relaxed">
          <p>
            You have the right to access, export, update, or request the deletion of your account and uploaded audio files at any time via your account settings or by contacting our legal compliance team at <a href={`mailto:${legalConfig.legalEmail}`} className="text-violet-400 underline">{legalConfig.legalEmail}</a>.
          </p>
          <p className="text-xs text-zinc-400">
            Uploaded music tracks can be deleted from your Music Library at any time. When a track is deleted, associated audio data is permanently purged from active servers.
          </p>
        </div>
      ),
    },
    {
      id: "security",
      title: "5. Security & Session Protection",
      icon: Lock,
      content: (
        <div className="space-y-3 text-zinc-300 text-sm leading-relaxed">
          <p>
            We implement cryptographic password hashing, strict HTTP-only session cookies, TLS encryption in transit, and role-based access controls to safeguard your data against unauthorized access or tampering.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/" className="hover:text-zinc-200">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-200 font-medium">Privacy Policy</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
                Privacy Policy
              </h1>
              <Badge variant="info">v{PRIVACY_METADATA.version}</Badge>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Effective Date: {PRIVACY_METADATA.effectiveDate} &bull; Last Revised:{" "}
              {PRIVACY_METADATA.lastUpdated}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyPageUrl}
              className="gap-1.5 text-xs"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copied Link
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Share Link
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => typeof window !== "undefined" && window.print()}
              className="gap-1.5 text-xs hidden sm:flex"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.id}
                id={sec.id}
                className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800/80 text-violet-400 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100">{sec.title}</h3>
                </div>
                <div className="pt-2 border-t border-zinc-800/60">
                  {sec.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact info card */}
        <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs text-zinc-400">
          <h4 className="text-sm font-bold text-zinc-200">
            Privacy & Data Inquiries
          </h4>
          <p>
            For inquiries regarding your personal data or privacy rights, please contact our designated Data Protection & Compliance Officer at:
          </p>
          <p className="text-zinc-300">
            <strong>Email:</strong> <a href={`mailto:${legalConfig.legalEmail}`} className="text-violet-400 hover:underline">{legalConfig.legalEmail}</a><br />
            <strong>Entity:</strong> {legalConfig.entityName}<br />
            <strong>Address:</strong> {legalConfig.mailingAddress}
          </p>
          <div className="pt-2 border-t border-zinc-800 flex items-center gap-4 text-xs">
            <Link href="/terms" className="text-violet-400 hover:underline flex items-center gap-1">
              View Terms of Service <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
