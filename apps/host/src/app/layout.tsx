import type { Metadata } from "next";
import "./globals.css";
import * as React from "react";
import Link from "next/link";
import { Providers } from "./providers";
import { HostNavHeader } from "../components/layout/HostNavHeader";

export const metadata: Metadata = {
  title: "TheQueue Host Studio - Live Broadcast & DJ Dashboard",
  description:
    "Authoritative live DJ playback deck, priority queue reordering, 2-minute qualification rule, and broadcast stream controller.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="bg-zinc-950 text-zinc-50 min-h-screen flex flex-col antialiased selection:bg-amber-500 selection:text-zinc-950">
        <Providers>
          {/* Navigation Bar */}
          <HostNavHeader />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-zinc-800/80 bg-zinc-950/80 py-5 text-center text-xs text-zinc-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>
                © {new Date().getFullYear()} TheQueue Live Broadcast Services.
                Backend-authoritative state & low-latency audio stream engine.
              </p>
              <div className="flex gap-6">
                <Link
                  href="/queue"
                  className="text-amber-500/80 hover:text-amber-400 transition-colors"
                >
                  Live DJ Deck
                </Link>
                <Link
                  href="/"
                  className="hover:text-zinc-300 transition-colors"
                >
                  Host Overview
                </Link>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
