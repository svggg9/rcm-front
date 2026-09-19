"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./Dialog.module.css";
import { lockModalScroll } from "./modalScrollLock";

/** Mount only while open. Native modal behaviour keeps the background inert. */
export function Dialog({ title, children, actions, busy = false, success = false, onClose }: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
  busy?: boolean;
  success?: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
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

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}
      aria-busy={busy || undefined}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <header className={styles.header}>
        {success ? <Icon name="check-circle" className={styles.success} /> : null}
        <h2 id={titleId}>{title}</h2>
        <button type="button" className={styles.close} aria-label="Закрыть"
          disabled={busy} onClick={onClose}><Icon name="x" /></button>
      </header>
      <div className={styles.body}>{children}</div>
      <footer className={styles.actions}>{actions}</footer>
    </dialog>
  );
}
