"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Button } from "../../components/ui/Button";
import { PopoverPanel } from "../../components/ui/PopoverPanel";
import styles from "./CartClearAction.module.css";

export function CartClearAction({ count, disabled, busy, error, onConfirm, className, onOpenChange, fallbackFocusRef }: {
  count: number; disabled: boolean; busy: boolean; error: string | null; onConfirm: () => Promise<boolean>; className?: string; onOpenChange?: (open: boolean) => void; fallbackFocusRef?: RefObject<HTMLElement | null>;
}) {
  const id = useId();
  const anchor = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pending, setPending] = useState(false);
  const [openedCount, setOpenedCount] = useState(count);
  const locked = busy || pending;
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);

  function finishClose(success = false) {
    timer.current = null;
    setClosing(false);
    setOpen(false);
    onOpenChange?.(false);
    if (success) requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!anchor.current?.isConnected || anchor.current.disabled) (fallbackFocusRef?.current ?? document.querySelector<HTMLElement>("a[href='/catalog']"))?.focus({ preventScroll: true });
      else anchor.current.focus({ preventScroll: true });
    }));
  }
  function close(restoreFocus = false) {
    if (inFlight.current || locked || timer.current !== null) return;
    if (restoreFocus) anchor.current?.focus({ preventScroll: true });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finishClose(); return; }
    setClosing(true);
    timer.current = setTimeout(() => finishClose(), 180);
  }
  async function confirm() {
    if (inFlight.current || locked || disabled) return;
    inFlight.current = true;
    setPending(true);
    let completed = false;
    try { completed = await onConfirm(); } finally { inFlight.current = false; setPending(false); }
    if (completed) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finishClose(true);
      else { setClosing(true); timer.current = setTimeout(() => finishClose(true), 180); }
    } else {
      requestAnimationFrame(() => {
        if (document.activeElement === document.body || document.getElementById(id)?.contains(document.activeElement)) {
          cancel.current?.focus({ preventScroll: true });
        }
      });
    }
  }
  const shownCount = locked ? openedCount : count;
  const quantity = new Intl.PluralRules("ru").select(shownCount);
  const noun = quantity === "one" ? "товар" : quantity === "few" ? "товара" : "товаров";
  return <>
    <Button ref={anchor} type="button" variant="utility" size="compact" className={className} aria-haspopup="dialog" aria-controls={id} aria-expanded={open && !closing}
      aria-disabled={locked || undefined} disabled={disabled && !open} onClick={() => {
        if (locked || disabled) return;
        if (closing) { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; setClosing(false); requestAnimationFrame(() => cancel.current?.focus({ preventScroll: true })); return; }
        if (open) close(); else { setOpenedCount(count); setOpen(true); onOpenChange?.(true); }
      }}>Очистить</Button>
    <PopoverPanel id={id} title="Очистить корзину?" open={open} onClose={() => close()} anchorRef={anchor}
      initialFocusRef={cancel} appearance="confirmation" motion="settle" closing={closing} dismissDisabled={locked}>
      <p className={styles.message}>Из корзины {quantity === "one" ? "будет удалён" : "будут удалены"} {shownCount} {noun}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}><Button ref={cancel} type="button" variant="secondary" disabled={locked} onClick={() => close(true)}>Отмена</Button>
        <Button type="button" variant="primary" loading={locked} disabled={locked || disabled} onClick={() => void confirm()}>Очистить</Button></div>
    </PopoverPanel>
  </>;
}
