import * as React from "react";
import { LoadingState } from "@platform/ui";

export default function LoadingPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <LoadingState message="Fetching system status logs..." />
    </div>
  );
}
