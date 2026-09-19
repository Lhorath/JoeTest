"use client";

import * as React from "react";
import { Button, ErrorState } from "@platform/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Admin HQ encountered an unhandled exception:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <ErrorState
        title="Admin Security Context Error"
        message={
          error.message ||
          "An unexpected error occurred while rendering the page."
        }
        retry={reset}
      />
    </div>
  );
}
