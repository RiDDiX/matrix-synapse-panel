"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] page error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-lg space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Something broke on this page</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error happened while rendering this page."}
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground">digest: {error.digest}</p>
        ) : null}
        <div className="flex gap-2">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button onClick={() => (window.location.href = "/admin")} variant="outline">
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
