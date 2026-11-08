"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BUYER_PANEL_RETURN_KEY,
  createBuyerPanelEntry,
  isBuyerPanelPath,
  readBuyerPanelEntry,
  requestBuyerPanelScroll,
  type BuyerPanelSnapshot,
  type BuyerReturnTarget,
} from "./buyerPanelReturn";

function currentHref() {
  return window.location.pathname + window.location.search + window.location.hash;
}

/** Mounted in the persistent Header: only known in-app screens become return targets. */
export function useBuyerPanelReturn(pathname: string, query: string) {
  const router = useRouter();
  const current = useRef<BuyerPanelSnapshot | null>(null);
  const historyHref = useRef<string | null>(null);

  useLayoutEffect(() => {
    const scrolled = () => {
      const snapshot = current.current;
      if (!snapshot || snapshot.target.href !== currentHref()) return;
      snapshot.target.x = Math.max(0, window.scrollX);
      snapshot.target.y = Math.max(0, window.scrollY);
    };
    const popped = () => {
      const href = currentHref();
      if (current.current?.target.href.split("#", 1)[0] === href.split("#", 1)[0]) {
        // Hash-only history does not rerender usePathname/useSearchParams.
        current.current.target.href = href;
        historyHref.current = null;
      } else historyHref.current = href;
    };
    const hashChanged = () => {
      const snapshot = current.current;
      const href = currentHref();
      if (snapshot?.target.href.split("#", 1)[0] === href.split("#", 1)[0]) {
        snapshot.target.href = href;
        if (snapshot.entry) {
          snapshot.entry = { ...snapshot.entry, href };
          window.history.replaceState({ ...window.history.state, [BUYER_PANEL_RETURN_KEY]: snapshot.entry }, "", href);
        }
        scrolled();
      }
    };
    window.addEventListener("scroll", scrolled, { passive: true });
    window.addEventListener("popstate", popped);
    window.addEventListener("hashchange", hashChanged);
    return () => {
      window.removeEventListener("scroll", scrolled);
      window.removeEventListener("popstate", popped);
      window.removeEventListener("hashchange", hashChanged);
    };
  }, []);

  useLayoutEffect(() => {
    const href = currentHref();
    const previous = current.current;
    if (previous?.target.href === href) return;
    const historyNavigation = historyHref.current === href;
    historyHref.current = null;
    const entry = isBuyerPanelPath(pathname)
      ? readBuyerPanelEntry(window.history.state, href) ?? createBuyerPanelEntry(href, previous, historyNavigation)
      : null;
    current.current = { target: { href, x: Math.max(0, window.scrollX), y: Math.max(0, window.scrollY) }, entry };
    if (entry) {
      // Preserve Next's own state and any independently owned history markers.
      window.history.replaceState({ ...window.history.state, [BUYER_PANEL_RETURN_KEY]: entry }, "", href);
    }
  }, [pathname, query]);

  const leave = useCallback((kind: "back" | "close") => {
    const target: BuyerReturnTarget = current.current?.entry?.[kind] ?? { href: "/catalog", x: 0, y: 0 };
    if (target.href === currentHref()) {
      window.scrollTo({ left: target.x, top: target.y, behavior: "instant" });
      return;
    }
    requestBuyerPanelScroll(target);
    router.replace(target.href, { scroll: false });
  }, [router]);

  const back = useCallback(() => leave("back"), [leave]);
  const close = useCallback(() => leave("close"), [leave]);
  return { back, close };
}
