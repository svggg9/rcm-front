"use client";

import { useEffect, type RefObject } from "react";
import { lockModalScroll } from "./modalScrollLock";

/** Shared native-modal lifecycle, including nested scroll locks and safe focus return. */
export function useModalDialog(ref: RefObject<HTMLDialogElement | null>, {
  enabled = true,
  fallbackFocusRef,
  initialFocusRef,
}: {
  enabled?: boolean;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
} = {}) {
  useEffect(() => {
    if (!enabled) return;
    const dialog = ref.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const fallbackFocus = fallbackFocusRef?.current;
    dialog.showModal();
    initialFocusRef?.current?.focus({ preventScroll: true });
    const unlock = lockModalScroll();
    return () => {
      dialog.close();
      unlock();
      const available = (element: Element | null | undefined): element is HTMLElement =>
        element instanceof HTMLElement && element.isConnected && !element.matches(':disabled, [aria-disabled="true"], [inert], [hidden]')
        && !element.closest('[inert], [hidden]');
      const target = available(previousFocus) ? previousFocus : fallbackFocus;
      if (available(target)) target.focus({ preventScroll: true });
    };
  }, [enabled, fallbackFocusRef, initialFocusRef, ref]);
}
