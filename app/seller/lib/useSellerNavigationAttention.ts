"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SellerTab } from "../types";
import {
  loadSellerNavigationAttention,
  type SellerNavigationAttentionResult,
} from "./sellerNavigationAttention";
import { SELLER_NAVIGATION_EVENT } from "./sellerNavigationEvents";
import { SELLER_ONBOARDING_EVENT } from "./sellerOnboardingEvents";

export function useSellerNavigationAttention(currentTab: SellerTab) {
  const [state, setState] = useState<SellerNavigationAttentionResult>({ items: {}, hasErrors: false });
  const [loading, setLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);

  const refresh = useCallback(() => {
    if (!mountedRef.current) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);

    void loadSellerNavigationAttention(controller.signal)
      .then(result => {
        if (!controller.signal.aborted && mountedRef.current) setState(result);
      })
      .catch(() => {
        if (!controller.signal.aborted && mountedRef.current) {
          setState({
            hasErrors: true,
            items: {
              home: {
                label: "Нет данных",
                href: "/seller/home",
                tone: "default",
                description: "Не удалось проверить открытые задачи — повторите проверку",
              },
            },
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    const refreshVisible = () => {
      if (active && document.visibilityState !== "hidden") refresh();
    };
    void Promise.resolve().then(refreshVisible);
    const timer = window.setInterval(refreshVisible, 60_000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener(SELLER_NAVIGATION_EVENT, refreshVisible);
    window.addEventListener(SELLER_ONBOARDING_EVENT, refreshVisible);
    window.addEventListener("seller-return-updated", refreshVisible);

    return () => {
      active = false;
      mountedRef.current = false;
      controllerRef.current?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener(SELLER_NAVIGATION_EVENT, refreshVisible);
      window.removeEventListener(SELLER_ONBOARDING_EVENT, refreshVisible);
      window.removeEventListener("seller-return-updated", refreshVisible);
    };
  }, [currentTab, refresh]);

  return { ...state, loading, refresh };
}
