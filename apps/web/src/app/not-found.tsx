import * as React from "react";
import { EmptyState, Button } from "@platform/ui";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <EmptyState
        title="Page Not Found"
        description="The page you are looking for does not exist or has been moved."
        action={
          <Link href="/">
            <Button variant="outline" size="sm">
              Return Home
            </Button>
          </Link>
        }
      />
    </div>
  );
}
