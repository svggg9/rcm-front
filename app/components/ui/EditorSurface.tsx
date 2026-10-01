"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import styles from "./EditorSurface.module.css";
import { Toaster } from "sonner";
import { toastIcons } from "./toastIcons";
import { lockModalScroll } from "./modalScrollLock";

export function requestEditorNavigation(action: () => void) {
  const event = new CustomEvent("rcm-editor-navigation", { cancelable: true, detail: action });
  if (window.dispatchEvent(event)) action();
}

/** Full editor surface; mount only while open. */
export function EditorSurface({ title, children, actions, dirty = false, busy = false, compact = false, toastId, closeLabel = "Закрыть редактор", guardNavigation = false, discardHint, onClose }: {
  title: ReactNode; children: ReactNode; actions?: ReactNode;
  dirty?: boolean; busy?: boolean; compact?: boolean; guardNavigation?: boolean; discardHint?: string; toastId?: string; closeLabel?: string; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [confirmClose, setConfirmClose] = useState(false);
  const leaveAction = useRef<(() => void) | null>(null);
  const historyGuard = useRef(false);
  const afterPop = useRef<(() => void) | null>(null);
  const current = useRef({dirty,busy,onClose});
  useEffect(()=>{current.current={dirty,busy,onClose};},[dirty,busy,onClose]);
  const leave = (action:()=>void) => {
    if(historyGuard.current && window.history.state?.rcmEditorGuard === titleId){
      afterPop.current=action; historyGuard.current=false; window.history.back();
    } else action();
  };
  useEffect(()=>{
    if(!guardNavigation) return;
    const pop=(event:PopStateEvent)=>{
      if(afterPop.current){event.stopImmediatePropagation();const action=afterPop.current;afterPop.current=null;action();return;}
      if(historyGuard.current && event.state?.rcmEditorGuard !== titleId){
        event.stopImmediatePropagation();window.history.forward();
        if(!current.current.busy){leaveAction.current=()=>window.history.back();setConfirmClose(true);}
      }
    };
    const click=(event:MouseEvent)=>{
      if(!current.current.dirty && !current.current.busy)return;
      const link=event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if(!link || link.target === '_blank' || link.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)return;
      const url=new URL(link.href);if(url.href === location.href || (url.pathname === location.pathname && url.search === location.search && url.hash))return;
      event.preventDefault();event.stopPropagation();
      if(!current.current.busy){leaveAction.current=()=>window.location.assign(url.href);setConfirmClose(true);}
    };
    const navigate = (event: Event) => {
      if (!current.current.dirty && !current.current.busy) return;
      event.preventDefault();
      if (!current.current.busy) {
        leaveAction.current = (event as CustomEvent<() => void>).detail;
        setConfirmClose(true);
      }
    };
    window.addEventListener('rcm-editor-navigation', navigate);
    window.addEventListener('popstate',pop,true);document.addEventListener('click',click,true);
    return ()=>{window.removeEventListener('rcm-editor-navigation', navigate);window.removeEventListener('popstate',pop,true);document.removeEventListener('click',click,true);};
  },[guardNavigation,titleId]);
  useEffect(()=>{
    if(!guardNavigation)return;
    if((dirty || busy) && !historyGuard.current){historyGuard.current=true;window.history.pushState({...window.history.state,rcmEditorGuard:titleId},'',location.href);}
    if(!dirty && !busy && historyGuard.current && window.history.state?.rcmEditorGuard === titleId){historyGuard.current=false;afterPop.current=()=>{};window.history.back();}
  },[dirty,busy,guardNavigation,titleId]);
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
    if (dirty) { leaveAction.current=onClose; setConfirmClose(true); }
    else leave(onClose);
  };
    return <>
    <dialog ref={ref} className={`${styles.surface} ${compact ? styles.compact : ""}`}
      role="dialog" aria-labelledby={titleId} aria-busy={busy || undefined}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); if(event.target === event.currentTarget) requestClose(); }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}>
      <header className={styles.header}>
        <h1 id={titleId}>{title}</h1>
        <Button variant="ghost" className={styles.close} aria-label={closeLabel} disabled={busy} onClick={requestClose}><Icon name="x" /></Button>
      </header>
      <div className={styles.body}>{children}</div>
      {actions ? <footer className={styles.footer}>{actions}</footer> : null}
      {toastId ? <Toaster icons={toastIcons} id={toastId} position="bottom-center" duration={1500} className="rcmToaster" toastOptions={{ closeButtonAriaLabel: "Закрыть уведомление", classNames: { toast: "rcmToast", title: "rcmToastTitle", description: "rcmToastDescription", actionButton: "rcmToastAction", cancelButton: "rcmToastCancel" } }} /> : null}
    </dialog>
    {confirmClose ? <Dialog title="Есть несохранённые изменения" onClose={() => setConfirmClose(false)}
      actions={<><Button variant="secondary" onClick={() => setConfirmClose(false)}>Вернуться к редактированию</Button><Button variant="primary" onClick={() => { setConfirmClose(false); const action=leaveAction.current ?? onClose; leaveAction.current=null; leave(action); }}>Закрыть без сохранения</Button></>}>
      <p>Если закрыть сейчас, внесённые изменения не сохранятся.</p>{discardHint && <p>{discardHint}</p>}
    </Dialog> : null}
  </>;
}
