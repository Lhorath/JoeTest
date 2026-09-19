import * as React from "react";
import { EmptyState, Button } from "@platform/ui";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <EmptyState
        title="Host Control Center - Page Not Found"
        description="The section you are trying to access is unavailable or does not exist."
        action={
          <Link href="/">
            <Button variant="outline" size="sm">
              Return to Overview
            </Button>
          </Link>
        }
      />
    </div>
  );
}
