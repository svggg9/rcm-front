"use client";

import { useEffect, type RefObject } from "react";

const FIELD_SELECTOR = [
  "input:not([type='hidden']):not(:disabled)",
  "textarea:not(:disabled)",
  "select:not(:disabled)",
  "[contenteditable='true']",
].join(",");

export function useAutoFocusFirstField(
  containerRef: RefObject<HTMLElement | null>,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && container.contains(activeElement)) {
      return;
    }

    window.requestAnimationFrame(() => {
      const field = container.querySelector<HTMLElement>(FIELD_SELECTOR);
      field?.focus({ preventScroll: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
