"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Shield,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Music,
  Radio,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Printer,
  Copy,
  Check,
  Search,
} from "lucide-react";
import { Button, Card, Badge } from "@platform/ui";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import { TERMS_METADATA, getLegalConfig } from "@platform/config";

interface LegalSection {
  id: string;
  number: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  content: React.ReactNode;
}

export default function TermsOfServicePage() {
  const { user } = useAuth();
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeSection, setActiveSection] = React.useState<string>("section-1");

  const [acceptanceStatus, setAcceptanceStatus] = React.useState<{
    isAccepted: boolean;
    lastAcceptedVersion: string | null;
    lastAcceptedAt: string | null;
  } | null>(null);
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [acceptanceMessage, setAcceptanceMessage] = React.useState<string | null>(
    null,
  );

  const legalConfig = getLegalConfig();

  React.useEffect(() => {
    if (!user) return;
    api.legal
      .getStatus()
      .then((res) => {
        setAcceptanceStatus({
          isAccepted: res.isAccepted,
          lastAcceptedVersion: res.lastAcceptedVersion || null,
          lastAcceptedAt: res.lastAcceptedAt || null,
        });
      })
      .catch(() => {});
  }, [user]);

  const handleRecordAcceptance = async () => {
    if (!user) return;
    setIsAccepting(true);
    try {
      const res = await api.legal.recordAcceptance({
        documentSlug: "terms",
        version: TERMS_METADATA.version,
        acceptanceSource: "TERMS_UPDATE",
      });
      setAcceptanceStatus({
        isAccepted: true,
        lastAcceptedVersion: res.record.version,
        lastAcceptedAt: res.record.acceptedAt,
      });
      setAcceptanceMessage("Your agreement to the current Terms of Service has been recorded.");
      setTimeout(() => setAcceptanceMessage(null), 5000);
    } catch (err: any) {
      setAcceptanceMessage("Failed to record acceptance. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  const copyPageUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const sections: LegalSection[] = [
    {
      id: "section-1",
      number: "1",
      title: "Agreement & Operator Details",
      icon: Scale,
      summary: "Who operates the platform and what this binding legal contract governs.",
      content: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p>
            Welcome to <strong className="text-zinc-100 font-semibold">TheQueue</strong> (also referred to as &ldquo;the Platform,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), operated by <strong className="text-zinc-100 font-semibold">{legalConfig.entityName}</strong>. These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User,&rdquo; &ldquo;Artist,&rdquo; &ldquo;Host,&rdquo; or &ldquo;you&rdquo;) and the Operator governing your access to and use of TheQueue websites, APIs, media delivery services, and related applications.
          </p>
          <p>
            By creating an account, uploading audio tracks, submitting music to broadcaster queues, purchasing priority placement, hosting a live review station, or accessing the Platform, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our companion <Link href="/privacy" className="text-violet-400 hover:text-violet-300 underline font-medium">Privacy Policy</Link>. If you do not agree to all terms and conditions set forth herein, you must immediately discontinue all use of the Platform.
          </p>
          <div className="p-4 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
            <h5 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Official Operator Notice Information</h5>
            <ul className="text-xs text-zinc-400 space-y-1">
              <li><strong className="text-zinc-300">Operating Entity:</strong> {legalConfig.entityName}</li>
              <li><strong className="text-zinc-300">Designated Legal Email:</strong> <a href={`mailto:${legalConfig.legalEmail}`} className="text-violet-400 hover:underline">{legalConfig.legalEmail}</a></li>
              <li><strong className="text-zinc-300">Copyright & DMCA Inquiries:</strong> <a href={`mailto:${legalConfig.copyrightEmail}`} className="text-violet-400 hover:underline">{legalConfig.copyrightEmail}</a></li>
              <li><strong className="text-zinc-300">Official Jurisdiction:</strong> {legalConfig.governingJurisdiction}</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "section-2",
      number: "2",
      title: "Scope of Service & Intermediary Role",
      icon: Shield,
      summary: "TheQueue operates solely as a technology platform and marketplace for live broadcaster queues.",
      content: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p>
            TheQueue provides digital workflow infrastructure enabling music creators to organize their track library and submit audio works to independent third-party live stream broadcasters (&ldquo;Hosts&rdquo;), and enabling Hosts to manage real-time queues, audition community music, and collect voluntary priority queue fees.
          </p>
          <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Platform Role Disclaimer</span>
            </div>
            <p>
              TheQueue is <strong className="text-amber-100">not a record label, talent agency, publisher, music distributor, copyright society, or employer</strong>. We do not curate, produce, or independently endorse user-submitted music or Host broadcast content. All feedback, opinions, song critiques, and ratings expressed by Hosts on stream represent their sole, independent artistic views.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "section-3",
      number: "3",
      title: "User Submissions & Intellectual Property",
      icon: Music,
      summary: "You retain full ownership of your music. Submitting grants a limited review license.",
      content: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p>
            <strong className="text-zinc-100 font-semibold">100% Artist Ownership:</strong> You retain all right, title, and interest (including all copyright, master recording rights, publishing rights, and neighboring rights) in and to any audio recordings, artwork, metadata, lyrics, and materials you upload to your Music Library or submit to a Host queue.
          </p>
          <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
            <h5 className="text-xs font-bold text-violet-300 uppercase tracking-wider">Limited Broadcast & Review License</h5>
            <p className="text-xs text-zinc-300 leading-normal">
              By submitting an audio track to a Host&apos;s queue (whether via Free Line or Paid Priority), you grant TheQueue and the specified Host a non-exclusive, worldwide, royalty-free, revocable license to transmit, stream, buffer, audition, and review your submission during live broadcasts and related stream archives for the sole purpose of live evaluation and queue fulfillment.
            </p>
          </div>
          <p>
            <strong className="text-zinc-100 font-semibold">Artist Warranties:</strong> You represent and warrant that:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-zinc-400">
            <li>You are the sole author and owner of the submitted track, or hold all valid written licenses, mechanical clearances, and master synchronization rights required to submit and play the work.</li>
            <li>Your submission does not contain unlicensed copyrighted samples, unauthorized stems, third-party stems without clearance, or unlawful recordings.</li>
            <li>Your submission does not violate any trademark, privacy, publicity, or intellectual property rights of any third party.</li>
            <li>Your submission is not defamatory, obscene, harassing, or violative of applicable laws.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "section-4",
      number: "4",
      title: "Priority Queue Fees & No-Outcome Guarantee",
      icon: CreditCard,
      summary: "Priority speeds up queue placement. It does NOT guarantee airplay, review, or positive reaction.",
      content: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <div className="p-4 rounded-lg bg-violet-950/30 border border-violet-800/40 space-y-3">
            <div className="flex items-center gap-2 text-violet-300 font-bold text-sm">
              <CreditCard className="h-4 w-4" />
              <span>Crucial Priority Queue Disclosure</span>
            </div>
            <p className="text-xs text-violet-200 leading-relaxed font-medium">
              Purchasing a Paid Priority Tier fast-tracks your submission&apos;s positional rank in the Host&apos;s queue ahead of free submissions. <strong className="text-white">Priority does not guarantee airplay, full track playback, a live critique, playlist placement, endorsement, or any specific broadcast outcome.</strong>
            </p>
          </div>
          <p>
            <strong className="text-zinc-100 font-semibold">Host Discretion & Stream Management:</strong> Broadcasters retain full editorial control over their livestream, queue pacing, and broadcast duration. A Host may skip, pause, fast-forward, or decline any submission if it violates their station content guidelines, exceeds allowable stream duration, contains offensive material, or if their livestream concludes.
          </p>
          <p>
            <strong className="text-zinc-100 font-semibold">Non-Refundability Policy:</strong> All priority queue purchases are completed voluntary transactions for expedited queue processing and are <strong className="text-zinc-100">final and non-refundable</strong> once processed, except where mandated by applicable consumer protection laws or in cases of verified fraudulent billing.
          </p>
        </div>
      ),
    },
    {
      id: "section-5",
      number: "5",
      title: "Host & Broadcaster Responsibilities",
      icon: Radio,
      summary: "Hosts are independent operators responsible for their own broadcasts and third-party platform compliance.",
      content: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p>
            Broadcasters approved to operate a Station on TheQueue agree to adhere to the following standards:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-400">
            <li><strong className="text-zinc-200">Independent Compliance:</strong> Hosts are solely responsible for complying with the Terms of Service, Community Guidelines, and copyright rules of their external livestream platforms (including Twitch, Kick, YouTube, TikTok, and Facebook Live).</li>
            <li><strong className="text-zinc-200">Payout & Stripe Connect Requirements:</strong> To accept paid submissions, Hosts must maintain a verified Stripe Connect account in good standing. TheQueue does not hold or escrow funds; all payments route through Stripe Connect with applicable platform service fees deducted.</li>
            <li><strong className="text-zinc-200">Broadcast Conduct:</strong> Hosts agree not to harass, abuse, or deliberately defame artists submitting music, and to clearly publish their station rules and explicit content policies.</li>
            <li><strong className="text-zinc-200">Station Suspension:</strong> TheQueue reserves the right to suspend or revoke station broadcasting privileges for repeated unfulfilled priority sessions, fraudulent payout activity, or severe terms violations.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "section-6",
      number: "6",
      title: "Prohibited Activities & Community Safety",
      icon: AlertTriangle,
      summary: "Prohibited conduct that will lead to account suspension or permanent termination.",
      content: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p>Users and Hosts agree not to engage in any of the following prohibited actions:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-400">
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="font-semibold text-red-400">Copyright Infringement</span>
              <p>Uploading music, stems, or audio you do not own or hold explicit broadcast rights for.</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="font-semibold text-red-400">Malicious Content</span>
              <p>Uploading files containing viruses, corrupted data, or harmful automated scripts.</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="font-semibold text-red-400">Queue Manipulation & Bots</span>
              <p>Using automated bots, scrapers, or exploits to flood or manipulate station queue positions.</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="font-semibold text-red-400">Harassment & Hate Speech</span>
              <p>Submitting audio containing hate speech, threats of violence, or unlawful harassment.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "section-7",
      number: "7",
      title: "DMCA & Copyright Takedown Procedure",
      icon: Scale,
      summary: "How copyright holders can submit notices of infringement and counter-notifications.",
      content: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p>
            TheQueue respects the intellectual property of artists and creators and complies with the Digital Millennium Copyright Act (17 U.S.C. § 512). If you believe your copyrighted work has been uploaded or reviewed without authorization, please transmit a formal DMCA Notice to our Designated Copyright Agent:
          </p>
          <div className="p-4 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs space-y-2">
            <h5 className="font-bold text-zinc-200 uppercase tracking-wider">Designated Copyright Agent Notice Details</h5>
            <p className="text-zinc-400">
              <strong className="text-zinc-300">Email:</strong> <a href={`mailto:${legalConfig.copyrightEmail}`} className="text-violet-400 hover:underline">{legalConfig.copyrightEmail}</a><br />
              <strong className="text-zinc-300">Attn:</strong> TheQueue Copyright & Legal Compliance Officer<br />
              <strong className="text-zinc-300">Mailing:</strong> {legalConfig.mailingAddress}
            </p>
            <p className="text-zinc-400 pt-2 border-t border-zinc-800">
              Your notice must include: (1) Physical or electronic signature; (2) Identification of the copyrighted work; (3) URL or specific identifier of the infringing material; (4) Your contact information; (5) A statement of good faith belief; and (6) A statement under penalty of perjury that the information is accurate and you are authorized to act on behalf of the owner.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "section-8",
      number: "8",
      title: "Disclaimers, Limitation of Liability & Indemnity",
      icon: Shield,
      summary: "Standard legal disclaimers, liability boundaries, and user indemnification obligations.",
      content: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p className="uppercase text-xs text-zinc-400 font-semibold tracking-wide">
            THE PLATFORM IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, THE OPERATOR DISCLAIMS ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="text-xs text-zinc-400">
            <strong className="text-zinc-300">Limitation of Liability:</strong> In no event shall TheQueue, its operators, officers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages arising from your access to or inability to use the Platform, including loss of data, revenue, or airplay opportunities.
          </p>
          <p className="text-xs text-zinc-400">
            <strong className="text-zinc-300">Indemnification:</strong> You agree to defend, indemnify, and hold harmless TheQueue, its operators, and Hosts from and against any claims, liabilities, damages, or costs (including reasonable legal fees) arising out of your uploaded music, violation of third-party copyrights, or breach of these Terms.
          </p>
        </div>
      ),
    },
    {
      id: "section-9",
      number: "9",
      title: "Governing Law, Dispute Resolution & Updates",
      icon: FileText,
      summary: "Applicable governing law, jurisdiction, and how terms modifications are communicated.",
      content: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of <strong className="text-zinc-100 font-semibold">{legalConfig.governingJurisdiction}</strong>, without regard to conflict of law principles. Any dispute arising under or relating to these Terms shall be resolved in the competent courts located in {legalConfig.governingJurisdiction}.
          </p>
          <p>
            We may revise these Terms from time to time to reflect platform evolution or regulatory updates. When material revisions are published, the &ldquo;Last Updated&rdquo; version date at the top of this document will be revised, and active users will receive notice in their dashboard.
          </p>
        </div>
      ),
    },
  ];

  const filteredSections = searchQuery.trim()
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.summary.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : sections;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Breadcrumb & Document Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Link href="/" className="hover:text-zinc-200">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-zinc-200 font-medium">Terms of Service</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
                  Terms of Service
                </h1>
                <Badge variant="info">v{TERMS_METADATA.version}</Badge>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Effective Date: {TERMS_METADATA.effectiveDate} &bull; Last Revised:{" "}
                {TERMS_METADATA.lastUpdated}
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
        </div>

        {/* User Acceptance Status Card (if logged in) */}
        {user && (
          <Card className="p-4 bg-zinc-900/60 border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {acceptanceStatus?.isAccepted ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  {acceptanceStatus?.isAccepted
                    ? "You have accepted the current Terms of Service"
                    : "Terms Agreement Status"}
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Signed in as <strong className="text-zinc-300">{user.email}</strong>
                  {acceptanceStatus?.lastAcceptedAt && (
                    <> &bull; Accepted on {new Date(acceptanceStatus.lastAcceptedAt).toLocaleDateString()}</>
                  )}
                </p>
                {acceptanceMessage && (
                  <p className="text-xs text-emerald-400 mt-1 font-medium">
                    {acceptanceMessage}
                  </p>
                )}
              </div>
            </div>

            <Button
              variant={acceptanceStatus?.isAccepted ? "outline" : "primary"}
              size="sm"
              isLoading={isAccepting}
              onClick={handleRecordAcceptance}
              className="text-xs shrink-0"
            >
              {acceptanceStatus?.isAccepted
                ? "Re-affirm Agreement"
                : "Acknowledge & Accept Terms"}
            </Button>
          </Card>
        )}

        {/* Search & Navigation Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar Table of Contents */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-20">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search clauses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 block mb-2">
                Table of Contents
              </span>
              <nav className="space-y-0.5">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`block px-2.5 py-1.5 rounded text-xs transition-colors ${
                      activeSection === sec.id
                        ? "bg-violet-600/20 text-violet-300 font-semibold"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                  >
                    <span className="text-zinc-500 mr-1.5">{sec.number}.</span>
                    {sec.title}
                  </a>
                ))}
              </nav>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/20 border border-zinc-800/60 text-xs text-zinc-400 space-y-2">
              <span className="font-semibold text-zinc-300 block">Related Legal Policies</span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/privacy"
                    className="text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-1"
                  >
                    Privacy Policy <ExternalLink className="h-3 w-3" />
                  </Link>
                </li>
                <li>
                  <a
                    href={`mailto:${legalConfig.copyrightEmail}`}
                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    DMCA Inquiry <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Main Legal Clauses Stream */}
          <div className="lg:col-span-3 space-y-6">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  id={section.id}
                  className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4 scroll-mt-24 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800/80 text-violet-400 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-violet-400">
                          Section {section.number}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-100 mt-0.5">
                        {section.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">{section.summary}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/60">
                    {section.content}
                  </div>
                </div>
              );
            })}

            {filteredSections.length === 0 && (
              <div className="p-8 text-center bg-zinc-900/30 rounded-xl border border-zinc-800 text-zinc-400 text-xs">
                No matching legal clauses found for &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
