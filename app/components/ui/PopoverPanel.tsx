"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

import { Button } from "./Button";
import { Icon } from "./Icon";
import styles from "./PopoverPanel.module.css";

type Props = {
  id: string;
  title: string;
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  variant?: "panel" | "hint";
  focusOnOpen?: boolean;
};

const viewportGap = 16;
const anchorGap = 8;

/** A nonmodal, anchored panel in the browser's top layer. */
export function PopoverPanel({ id, title, open, onClose, anchorRef, children, initialFocusRef, variant = "panel", focusOnOpen = true }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const openRef = useRef(open);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    openRef.current = open;
  }, [onClose, open]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (!open) {
      if (panel.matches(":popover-open")) panel.hidePopover();
      return;
    }

    let positionFrame: number | null = null;
    let focusFrame: number | null = null;

    function updatePosition() {
      if (!panel || !panel.matches(":popover-open")) return;
      const anchor = anchorRef.current;
      if (!anchor?.isConnected) {
        onCloseRef.current();
        return;
      }

      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const anchorRect = anchor.getBoundingClientRect();
      if (variant === "hint" && (anchorRect.bottom <= viewportTop || anchorRect.top >= viewportTop + viewportHeight
        || anchorRect.right <= viewportLeft || anchorRect.left >= viewportLeft + viewportWidth)) {
        onCloseRef.current();
        return;
      }
      const availableHeight = Math.max(0, viewportHeight - viewportGap * 2);
      panel.style.maxHeight = `${availableHeight}px`;
      panel.style.maxWidth = `${Math.max(0, viewportWidth - viewportGap * 2)}px`;

      const panelRect = variant === "hint" ? { width: panel.offsetWidth, height: panel.offsetHeight } : panel.getBoundingClientRect();
      const minLeft = viewportLeft + viewportGap;
      const maxLeft = viewportLeft + viewportWidth - viewportGap - panelRect.width;
      const minTop = viewportTop + viewportGap;
      const maxTop = viewportTop + viewportHeight - viewportGap - panelRect.height;
      const hint = variant === "hint";
      const iconRect = hint ? anchor.querySelector("svg")?.getBoundingClientRect() ?? anchorRect : anchorRect;
      const below = iconRect.bottom + anchorGap;
      const above = iconRect.top - anchorGap - panelRect.height;
      const preferredTop = hint && above >= minTop ? above : below + panelRect.height <= viewportTop + viewportHeight - viewportGap
        ? below
        : above >= minTop ? above : below;

      const center = anchorRect.left + anchorRect.width / 2;
      const left = Math.max(minLeft, Math.min(hint ? center - panelRect.width / 2 : anchorRect.right - panelRect.width, maxLeft));
      panel.style.left = `${left}px`;
      panel.style.top = `${Math.max(minTop, Math.min(preferredTop, maxTop))}px`;
      if (hint) {
        panel.dataset.placement = preferredTop === above ? "above" : "below";
        panel.style.setProperty("--hint-arrow-left", `${Math.max(12, Math.min(center - left, panelRect.width - 12))}px`);
      }
    }

    function schedulePosition() {
      if (positionFrame !== null) return;
      positionFrame = window.requestAnimationFrame(() => {
        positionFrame = null;
        updatePosition();
      });
    }

    function handleScroll(event: Event) {
      if (event.target instanceof Node && panel?.contains(event.target)) return;
      schedulePosition();
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!(event.target instanceof Node) || panel?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      onCloseRef.current();
    }

    function handleKeyDown(event: KeyboardEvent) {
      // A nested select gets the first Escape so its list can close independently.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // A newer modal must handle Escape itself, not a popover behind it.
      const focusedModal = document.activeElement?.closest("dialog:modal");
      if (focusedModal && !focusedModal.contains(anchorRef.current) && !focusedModal.contains(panel)) return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
      // A hover hint must not take keyboard focus from an unrelated control.
      if (variant !== "hint" || panel?.contains(document.activeElement) || anchorRef.current === document.activeElement) {
        anchorRef.current?.focus({ preventScroll: true });
      }
    }

    function handleToggle() {
      // Programmatic close follows the controlled prop and must not close twice.
      if (openRef.current && panel && !panel.matches(":popover-open")) {
        onCloseRef.current();
      }
    }

    panel.addEventListener("toggle", handleToggle);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleOutsideClick, true);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", schedulePosition);
    window.visualViewport?.addEventListener("resize", schedulePosition);
    window.visualViewport?.addEventListener("scroll", schedulePosition);

    if (!panel.matches(":popover-open")) panel.showPopover();
    updatePosition();

    const resizeObserver = new ResizeObserver(schedulePosition);
    resizeObserver.observe(panel);
    if (bodyRef.current) resizeObserver.observe(bodyRef.current);
    if (anchorRef.current) resizeObserver.observe(anchorRef.current);

    focusFrame = window.requestAnimationFrame(() => {
      focusFrame = null;
      if (!panel.matches(":popover-open") || !focusOnOpen) return;
      const initial = initialFocusRef?.current;
      const controls = bodyRef.current?.querySelectorAll<HTMLElement>(
        'input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      );
      const firstControl = Array.from(controls ?? []).find(control =>
        control.tabIndex >= 0 && control.getClientRects().length > 0
        && !control.closest('[hidden], [aria-hidden="true"]'),
      );
      (initial?.isConnected ? initial : firstControl ?? panel).focus({ preventScroll: true });
    });

    return () => {
      panel.removeEventListener("toggle", handleToggle);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleOutsideClick, true);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", schedulePosition);
      window.visualViewport?.removeEventListener("resize", schedulePosition);
      window.visualViewport?.removeEventListener("scroll", schedulePosition);
      resizeObserver.disconnect();
      if (positionFrame !== null) window.cancelAnimationFrame(positionFrame);
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
      if (panel.matches(":popover-open")) panel.hidePopover();
    };
  }, [open, anchorRef, initialFocusRef, focusOnOpen, variant]);

  return (
    <div ref={panelRef} id={id} popover={variant === "hint" ? "manual" : "auto"} role={variant === "hint" ? "tooltip" : "dialog"} aria-label={title}
      tabIndex={variant === "hint" ? undefined : -1} hidden={!open} className={`${styles.panel} ${variant === "hint" ? styles.hint : ""}`} data-ui="popover-panel">
      {variant === "panel" && <header className={styles.header}>
        <h2>{title}</h2>
        <Button type="button" variant="ghost" iconOnly className={styles.close} aria-label={`Закрыть: ${title.toLocaleLowerCase("ru")}`}
          onClick={() => { onClose(); anchorRef.current?.focus({ preventScroll: true }); }}>
          <Icon name="x" size={20} strokeWidth={1.5} />
        </Button>
      </header>}
      <div ref={bodyRef} className={styles.body}>{open ? children : null}</div>
    </div>
  );
}
