"use client";

import * as React from "react";
import { AuthProvider } from "../providers/AuthProvider";
import { HostLiveSessionProvider } from "../providers/HostLiveSessionProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HostLiveSessionProvider>{children}</HostLiveSessionProvider>
    </AuthProvider>
  );
}
