"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import { RcmToaster } from "./RcmToaster";
import { toast } from "./toast";
import styles from "./Dialog.module.css";
import { lockModalScroll } from "./modalScrollLock";

/** Mount only while open. Native modal behaviour keeps the background inert. */
export function Dialog({ title, children, actions, busy = false, success = false, toastId, size = "default", mobileFullscreen = false, onClose }: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
  busy?: boolean;
  success?: boolean;
  toastId?: string;
  size?: "default" | "wide";
  mobileFullscreen?: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    const unlock = lockModalScroll();
    return () => {
      dialog.close();
      unlock();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    if (!toastId) return;
    return () => {
      toast.getToasts().filter(notification => "toasterId" in notification && notification.toasterId === toastId)
        .forEach(notification => toast.dismiss(notification.id));
    };
  }, [toastId]);
  useEffect(() => {
    if (!toastId || !ref.current || !footerRef.current) return;
    const dialog = ref.current;
    const footer = footerRef.current;
    const update = () => dialog.style.setProperty("--editor-actions-height",
      `${footer.getBoundingClientRect().height + parseFloat(getComputedStyle(dialog).paddingBottom)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    return () => observer.disconnect();
  }, [toastId, actions]);

  return (
    <dialog ref={ref} className={`${styles.dialog}${toastId ? ` ${styles.withNotifications}` : ""}${size === "wide" ? ` ${styles.wide}` : ""}${mobileFullscreen ? ` ${styles.mobileFullscreen}` : ""}`} aria-labelledby={titleId}
      aria-busy={busy || undefined}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); if (!busy) onClose(); }}>
      <header className={styles.header}>
        {success ? <Icon name="check-circle" className={styles.success} /> : null}
        <h2 id={titleId}>{title}</h2>
        <button type="button" className={styles.close} aria-label="Закрыть"
          disabled={busy} onClick={onClose}><Icon name="x" /></button>
      </header>
      <div className={styles.body}>{children}</div>
      <footer ref={footerRef} className={styles.actions}>{actions}</footer>
      {toastId ? <RcmToaster id={toastId} /> : null}
    </dialog>
  );
}
