import type { Metadata } from "next";
import "./globals.css";
import * as React from "react";
import Link from "next/link";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Hookline Reviews - Live Stream Music Submissions & Feedback",
  description: "Music submission and review platform for live stream hosts, artists, and administrators.",
  openGraph: {
    title: "Hookline Reviews - Live Stream Music Submissions & Feedback",
    description: "Music submission and review platform for live stream hosts, artists, and administrators.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="bg-zinc-950 text-zinc-50 min-h-screen flex flex-col antialiased selection:bg-violet-500/30 selection:text-violet-200">
        <ThemeProvider>
          <AuthProvider>
            {/* Top Navigation Bar */}
            <Navbar />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-800 bg-zinc-950 py-8 text-sm text-zinc-500">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-400">TheQueue</span>
                  <span>— Live Stream Music Submission Platform</span>
                </div>
                <div className="flex gap-6 text-xs font-medium">
                  <Link
                    href="/hosts"
                    className="hover:text-zinc-300 transition-colors"
                  >
                    Live Stations
                  </Link>
                  <Link
                    href="/library"
                    className="hover:text-zinc-300 transition-colors"
                  >
                    Music Library
                  </Link>
                  <Link
                    href="/account"
                    className="hover:text-zinc-300 transition-colors"
                  >
                    Account
                  </Link>
                  <Link
                    href="/privacy"
                    className="hover:text-zinc-300 transition-colors"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/terms"
                    className="hover:text-zinc-300 transition-colors"
                  >
                    Terms
                  </Link>
                </div>
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
