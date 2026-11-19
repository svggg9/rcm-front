"use client";

import { useEffect } from "react";

/** Restore a direct fragment after streamed content, styles and fonts are ready. */
export function useInitialHashNavigation() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || performance.getEntriesByType("navigation").some(entry =>
      (entry as PerformanceNavigationTiming).type === "back_forward")) return;

    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    const cancel = () => { cancelled = true; };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    for (const event of events) window.addEventListener(event, cancel, { passive: true });

    const align = () => {
      void document.fonts.ready.then(() => {
        if (cancelled) return;
        firstFrame = requestAnimationFrame(() => {
          secondFrame = requestAnimationFrame(() => {
            if (cancelled || window.location.hash !== hash) return;
            let id: string;
            try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
            document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
          });
        });
      });
    };
    if (document.readyState === "complete") align();
    else window.addEventListener("load", align, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", align);
      for (const event of events) window.removeEventListener(event, cancel);
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);
}
