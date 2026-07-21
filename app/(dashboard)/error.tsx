"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-xl bg-crimson/10 border border-crimson/20 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-crimson" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            This panel hit an unexpected error. Your session is still active —
            try reloading the panel.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-muted-foreground/60 pt-1">
              Ref: {error.digest}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
