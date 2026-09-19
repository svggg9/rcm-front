"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import styles from "./EditorSurface.module.css";
import { Toaster } from "sonner";
import { toastIcons } from "./toastIcons";
import { lockModalScroll } from "./modalScrollLock";

/** Full editor surface; mount only while open. */
export function EditorSurface({ title, children, actions, dirty = false, busy = false, compact = false, toastId, onClose }: {
  title: ReactNode; children: ReactNode; actions?: ReactNode;
  dirty?: boolean; busy?: boolean; compact?: boolean; toastId?: string; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [confirmClose, setConfirmClose] = useState(false);
  useEffect(() => {
    const dialog = ref.current!;
    const focus = document.activeElement;
    dialog.showModal();
    const unlock = lockModalScroll();
    return () => {
      dialog.close();
      unlock();
      if (focus instanceof HTMLElement && focus.isConnected) focus.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (!dirty && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, busy]);
  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirmClose(true);
    else onClose();
  };
    return <>
    <dialog ref={ref} className={`${styles.surface} ${compact ? styles.compact : ""}`}
      role="dialog" aria-labelledby={titleId} aria-busy={busy || undefined}
      onCancel={(event) => { event.preventDefault(); requestClose(); }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}>
      <header className={styles.header}>
        <h1 id={titleId}>{title}</h1>
        <Button variant="ghost" className={styles.close} aria-label="Закрыть редактор" disabled={busy} onClick={requestClose}><Icon name="x" /></Button>
      </header>
      <div className={styles.body}>{children}</div>
      {actions ? <footer className={styles.footer}>{actions}</footer> : null}
      {toastId ? <Toaster icons={toastIcons} id={toastId} position="bottom-center" duration={1500} className="rcmToaster" toastOptions={{ closeButtonAriaLabel: "Закрыть уведомление", classNames: { toast: "rcmToast", title: "rcmToastTitle", description: "rcmToastDescription", actionButton: "rcmToastAction", cancelButton: "rcmToastCancel" } }} /> : null}
    </dialog>
    {confirmClose ? <Dialog title="Есть несохранённые изменения" onClose={() => setConfirmClose(false)}
      actions={<><Button variant="secondary" onClick={() => setConfirmClose(false)}>Вернуться к редактированию</Button><Button variant="primary" onClick={() => { setConfirmClose(false); onClose(); }}>Закрыть без сохранения</Button></>}>
      <p>Если закрыть сейчас, внесённые изменения не сохранятся.</p>
    </Dialog> : null}
  </>;
}
