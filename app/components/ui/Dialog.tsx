"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { RcmToaster } from "./RcmToaster";
import { toast } from "./toast";
import styles from "./Dialog.module.css";
import { useModalDialog } from "./useModalDialog";

/** Mount only while open. Native modal behaviour keeps the background inert. */
export function Dialog({ title, children, actions, mobileHeader, busy = false, success = false, toastId, size = "default", mobileFullscreen = false, variant = "default", className = "", closeOnBackdrop = false, fallbackFocusRef, onClose }: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  mobileHeader?: ReactNode;
  busy?: boolean;
  success?: boolean;
  toastId?: string;
  size?: "default" | "wide";
  mobileFullscreen?: boolean;
  variant?: "default" | "confirmation";
  className?: string;
  closeOnBackdrop?: boolean;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useModalDialog(ref, { fallbackFocusRef });

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
    <dialog ref={ref} className={`${styles.dialog}${toastId ? ` ${styles.withNotifications}` : ""}${size === "wide" ? ` ${styles.wide}` : ""}${mobileFullscreen ? ` ${styles.mobileFullscreen}` : ""}${mobileHeader ? ` ${styles.withMobileHeader}` : ""}${variant === "confirmation" ? ` ${styles.confirmation}` : ""} ${className}`.trim()} aria-labelledby={titleId}
      aria-busy={busy || undefined}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); if (!busy) onClose(); }}
      onMouseDown={event => {
        if (!closeOnBackdrop || busy || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <header className={styles.header}>
        {success ? <Icon name="check-circle" className={styles.success} /> : null}
        <h2 id={titleId}>{title}</h2>
        <Button type="button" variant="ghost" iconOnly className={styles.close} aria-label="Закрыть"
          disabled={busy} onClick={onClose}><Icon name="x" /></Button>
      </header>
      {mobileHeader ? <div className={styles.mobileHeader}>{mobileHeader}</div> : null}
      <div className={styles.body}>{children}</div>
      {actions ? <footer ref={footerRef} className={styles.actions}>{actions}</footer> : null}
      {toastId ? <RcmToaster id={toastId} /> : null}
    </dialog>
  );
}
