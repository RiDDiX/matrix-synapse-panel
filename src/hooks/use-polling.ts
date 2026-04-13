"use client";

import { useEffect, useRef } from "react";

interface PollingOptions {
  intervalMs: number;
  enabled?: boolean;
  pauseWhenHidden?: boolean;
}

/**
 * Re-runs `fn` every `intervalMs` while the tab is visible.
 * Cleans up on unmount and when dependencies change.
 */
export function usePolling(fn: () => void | Promise<void>, options: PollingOptions, deps: React.DependencyList = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const { intervalMs, enabled = true, pauseWhenHidden = true } = options;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (pauseWhenHidden && typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void fnRef.current();
    };

    const id = setInterval(tick, intervalMs);

    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void fnRef.current();
      }
    };
    if (pauseWhenHidden && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }

    return () => {
      cancelled = true;
      clearInterval(id);
      if (pauseWhenHidden && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled, pauseWhenHidden, ...deps]);
}
