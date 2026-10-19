"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import styles from "./EditorSurface.module.css";
import { RcmToaster } from "./RcmToaster";
import { toast } from "./toast";
import { lockModalScroll } from "./modalScrollLock";

export function requestEditorNavigation(action: () => void, { completed = false }: { completed?: boolean } = {}) {
  // A confirmed, successful mutation has already resolved the unsaved draft.
  const event = new CustomEvent(completed ? "rcm-editor-completion" : "rcm-editor-navigation", { cancelable: true, detail: action });
  if (window.dispatchEvent(event)) action();
}

/** Full editor surface; mount only while open. */
export function EditorSurface({ title, headerMeta, subtitle, children, actions, navigation, className = "", dirty = false, busy = false, compact = false, centered = false, toastId, closeLabel = "Закрыть редактор", guardNavigation = false, discardHint, onClose }: {
  title: ReactNode; headerMeta?: ReactNode; subtitle?: ReactNode; children: ReactNode; actions?: ReactNode; navigation?: ReactNode;
  className?: string; dirty?: boolean; busy?: boolean; compact?: boolean; centered?: boolean; guardNavigation?: boolean; discardHint?: string; toastId?: string; closeLabel?: string; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const [confirmClose, setConfirmClose] = useState(false);
  const leaveAction = useRef<(() => void) | null>(null);
  const historyGuard = useRef(false);
  const afterPop = useRef<(() => void) | null>(null);
  const restoringGuard = useRef(false);
  const completing = useRef(false);
  const queuedCompletion = useRef<(() => void) | null>(null);
  const current = useRef({dirty,busy,onClose});
  useEffect(()=>{current.current={dirty,busy,onClose};},[dirty,busy,onClose]);
  const leave = useCallback((action:()=>void) => {
    if(historyGuard.current && window.history.state?.rcmEditorGuard === titleId){
      afterPop.current=action; historyGuard.current=false; window.history.back();
    } else action();
  }, [titleId]);
  useEffect(()=>{
    if(!guardNavigation) return;
    const pop=(event:PopStateEvent)=>{
      if (restoringGuard.current && event.state?.rcmEditorGuard === titleId) {
        restoringGuard.current = false;
        if (queuedCompletion.current) {
          event.stopImmediatePropagation();
          const action = queuedCompletion.current;
          queuedCompletion.current = null;
          leave(action);
          return;
        }
      }
      if(afterPop.current){event.stopImmediatePropagation();const action=afterPop.current;afterPop.current=null;action();return;}
      if(historyGuard.current && event.state?.rcmEditorGuard !== titleId){
        event.stopImmediatePropagation();restoringGuard.current=true;window.history.forward();
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
    const complete = (event: Event) => {
      event.preventDefault();
      completing.current = true;
      const action = (event as CustomEvent<() => void>).detail;
      if (restoringGuard.current) queuedCompletion.current = action;
      else leave(action);
    };
    window.addEventListener('rcm-editor-navigation', navigate);
    window.addEventListener('rcm-editor-completion', complete);
    window.addEventListener('popstate',pop,true);document.addEventListener('click',click,true);
    return ()=>{window.removeEventListener('rcm-editor-navigation', navigate);window.removeEventListener('rcm-editor-completion', complete);window.removeEventListener('popstate',pop,true);document.removeEventListener('click',click,true);};
  },[guardNavigation,titleId,leave]);
  useEffect(()=>{
    if(!guardNavigation || completing.current)return;
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
    if (!toastId) return;
    return () => {
      toast.getToasts().filter(notification => "toasterId" in notification && notification.toasterId === toastId)
        .forEach(notification => toast.dismiss(notification.id));
    };
  }, [toastId]);
  useEffect(() => {
    if (!toastId || !footerRef.current || !ref.current) return;
    const dialog = ref.current;
    const footer = footerRef.current;
    const update = () => dialog.style.setProperty("--editor-actions-height", `${footer.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    return () => observer.disconnect();
  }, [toastId, actions]);
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
    <dialog ref={ref} className={`${styles.surface} ${compact ? styles.compact : ""} ${centered ? styles.centered : ""} ${className}`}
      role="dialog" aria-labelledby={titleId} aria-busy={busy || undefined}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); if(event.target === event.currentTarget) requestClose(); }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}>
      <header className={styles.header}>
        <div className={styles.heading}>
          {headerMeta ? <div className={styles.headerMeta}>{headerMeta}</div> : null}
          <h1 id={titleId}>{title}</h1>
          {subtitle ? <div className={styles.subtitle} title={typeof subtitle === "string" ? subtitle : undefined}>{subtitle}</div> : null}
        </div>
        <Button variant="ghost" className={styles.close} aria-label={closeLabel} disabled={busy} onClick={requestClose}><Icon name="x" /></Button>
      </header>
      {navigation ? <div className={styles.navigation}>{navigation}</div> : null}
      <div className={styles.body} data-editor-body>{children}</div>
      {actions ? <footer ref={footerRef} className={styles.footer}>{actions}</footer> : null}
      {toastId ? <RcmToaster id={toastId} /> : null}
    </dialog>
    {confirmClose ? <Dialog title="Есть несохранённые изменения" onClose={() => setConfirmClose(false)}
      actions={<><Button variant="secondary" onClick={() => setConfirmClose(false)}>Вернуться к редактированию</Button><Button variant="primary" onClick={() => { setConfirmClose(false); const action=leaveAction.current ?? onClose; leaveAction.current=null; leave(action); }}>Закрыть без сохранения</Button></>}>
      <p>Если закрыть сейчас, внесённые изменения не сохранятся</p>{discardHint && <p>{discardHint}</p>}
    </Dialog> : null}
  </>;
}
