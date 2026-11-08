"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { consumeBuyerPanelScroll, restoreBuyerPanelScroll } from "../lib/buyerPanelReturn";

function isCabinet(path: string) {
  return /^\/(seller|admin)(\/|$)/.test(path);
}

/** New buyer pages start at the top; history and in-page anchors keep native scrolling. */
export function NavigationScrollReset() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const historyTarget = useRef<string | null>(null);

  useEffect(() => {
    const onPopState = () => {
      historyTarget.current = window.location.pathname;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useLayoutEffect(() => {
    const returnTarget = consumeBuyerPanelScroll(window.location.pathname + window.location.search + window.location.hash);
    const previous = previousPath.current;
    previousPath.current = pathname;
    if (returnTarget) return restoreBuyerPanelScroll(returnTarget);
    if (previous === pathname) return;
    const isHistoryNavigation = historyTarget.current === pathname;
    historyTarget.current = null;
    if (isHistoryNavigation || window.location.hash || isCabinet(previous) || isCabinet(pathname)) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
