"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type SetStateAction } from "react";

export function useDropdown<TControl extends HTMLElement = HTMLButtonElement>({ disabled = false, readOnly = false, onClose }: {
  disabled?: boolean; readOnly?: boolean; onClose?: () => void;
} = {}) {
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState({ side: "bottom" as "top" | "bottom", maxHeight: 260 });
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<TControl>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusFrame = useRef<number | null>(null);
  const inactive = disabled || readOnly;
  const open = expanded && !inactive;
  if (inactive && expanded) setExpanded(false);

  const cancelFocus = useCallback(() => {
    if (focusFrame.current !== null) window.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = null;
  }, []);
  const closeMenu = useCallback((returnFocus = false) => {
    cancelFocus();
    setExpanded(false);
    onClose?.();
    if (returnFocus && !disabled) controlRef.current?.focus({ preventScroll: true });
  }, [cancelFocus, disabled, onClose]);
  const setOpen = useCallback((next: SetStateAction<boolean>) => {
    setExpanded(current => !inactive && (typeof next === "function" ? next(current) : next));
  }, [inactive]);

  useEffect(() => {
    if (inactive) { cancelFocus(); onClose?.(); }
  }, [inactive, cancelFocus, onClose]);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, closeMenu]);
  useEffect(() => cancelFocus, [cancelFocus]);

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const anchor = menuRef.current;
    function updatePosition() {
      const viewport = window.visualViewport;
      let top = (viewport?.offsetTop ?? 0) + 8;
      let bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 8;
      for (let parent = anchor.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (!/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) continue;
        const bounds = parent.getBoundingClientRect();
        top = Math.max(top, bounds.top + parent.clientTop);
        bottom = Math.min(bottom, bounds.top + parent.clientTop + parent.clientHeight);
      }
      const bounds = anchor.getBoundingClientRect();
      const below = Math.max(0, bottom - bounds.bottom);
      const above = Math.max(0, bounds.top - top);
      const content = anchor.querySelector<HTMLElement>('[role="listbox"] > div');
      const desired = Math.min(260, content?.scrollHeight || 260);
      const side = below < desired && above > below ? "top" : "bottom";
      const maxHeight = Math.max(1, Math.floor(Math.min(260, side === "top" ? above : below)));
      setPosition(current => current.side === side && current.maxHeight === maxHeight ? current : { side, maxHeight });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    const observer = new ResizeObserver(updatePosition);
    if (controlRef.current) observer.observe(controlRef.current);
    const content = anchor.querySelector<HTMLElement>('[role="listbox"] > div');
    if (content) observer.observe(content);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [open]);

  function focusOption(key: string) {
    const options = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not(:disabled)') ?? [])
      .filter(option => !option.closest('[aria-hidden="true"], [inert]'));
    if (!options.length) return;
    const current = options.indexOf(document.activeElement as HTMLElement);
    const selected = options.findIndex(option => option.getAttribute("aria-selected") === "true");
    const index = key === "Home" ? 0 : key === "End" ? options.length - 1 : current < 0
      ? selected >= 0 ? selected : key === "ArrowUp" ? options.length - 1 : 0
      : Math.max(0, Math.min(options.length - 1, current + (key === "ArrowUp" ? -1 : 1)));
    options[index].focus({ preventScroll: true });
    options[index].scrollIntoView({ block: "nearest" });
  }
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (inactive) return;
    if (event.key === "Escape" && open) {
      event.preventDefault(); event.stopPropagation(); closeMenu(true);
    } else if (event.key === "Tab" && open) {
      // Restore the single tab stop before the browser advances to the next field.
      closeMenu(true);
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      if (event.target === controlRef.current && event.target instanceof HTMLInputElement && ["Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (open) focusOption(event.key);
      else {
        setOpen(true);
        const key = event.key;
        cancelFocus();
        focusFrame.current = window.requestAnimationFrame(() => {
          focusFrame.current = null;
          if (controlRef.current?.getAttribute("aria-expanded") === "true" && !controlRef.current.matches(":disabled")) focusOption(key);
        });
      }
    }
  }
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
  }

  return { open, setOpen, rootRef, controlRef, menuRef, closeMenu, handleKeyDown, handleBlur,
    menuStyle: { "--dropdown-max-height": `${position.maxHeight}px` } as CSSProperties, side: position.side };
}
