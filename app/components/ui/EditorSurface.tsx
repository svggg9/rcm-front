"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type FocusEventHandler } from "react";
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

/** Full editor surface; dialog by default, or an ordinary document page. */
export function EditorSurface({ title, headerMeta, subtitle, headerActions, children, actions, navigation, className = "", dirty = false, busy = false, compact = false, centered = false, presentation = "dialog", toastId, closeLabel = "Закрыть редактор", backLabel = "Назад", showBack = true, guardNavigation = false, discardHint, beforeLeave, onFieldBlur, onDiscard, onClose }: {
  title: ReactNode; headerMeta?: ReactNode; subtitle?: ReactNode; headerActions?: ReactNode; children: ReactNode; actions?: ReactNode; navigation?: ReactNode;
  className?: string; dirty?: boolean; busy?: boolean; compact?: boolean; centered?: boolean; presentation?: "dialog" | "page"; guardNavigation?: boolean; discardHint?: string; toastId?: string; closeLabel?: string; backLabel?: string; showBack?: boolean; onDiscard?: () => void; onClose: () => void;
  beforeLeave?: () => Promise<boolean>; onFieldBlur?: FocusEventHandler<HTMLElement>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const [confirmClose, setConfirmClose] = useState(false);
  const leaveAction = useRef<(() => void) | null>(null);
  const historyGuard = useRef(false);
  const afterPop = useRef<(() => void) | null>(null);
  const restoringGuard = useRef(false);
  const completing = useRef(false);
  const queuedCompletion = useRef<(() => void) | null>(null);
  const current = useRef({dirty,busy,onClose,beforeLeave});
  const leaving = useRef(false);
  useEffect(()=>{current.current={dirty,busy,onClose,beforeLeave};},[dirty,busy,onClose,beforeLeave]);
  const leave = useCallback((action:()=>void) => {
    // An explicit discard or completed mutation already authorizes leaving.
    // Native beforeunload must not ask again for full-document link navigation.
    completing.current = true;
    if(historyGuard.current && window.history.state?.rcmEditorGuard === titleId){
      afterPop.current=action; historyGuard.current=false; window.history.back();
    } else action();
  }, [titleId]);
  const attemptLeave = useCallback(async (action: () => void) => {
    if (leaving.current || current.current.busy) return;
    leaving.current = true;
    try {
      if (current.current.beforeLeave && await current.current.beforeLeave()) {
        completing.current = true;
        if (restoringGuard.current) queuedCompletion.current = action;
        else leave(action);
      } else { leaveAction.current = action; setConfirmClose(true); }
    } catch { leaveAction.current = action; setConfirmClose(true); }
    finally { leaving.current = false; }
  }, [leave]);
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
        if(!current.current.busy) void attemptLeave(()=>window.history.back());
      }
    };
    const click=(event:MouseEvent)=>{
      if(!current.current.dirty && !current.current.busy)return;
      const link=event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if(!link || link.target === '_blank' || link.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)return;
      const url=new URL(link.href);if(url.href === location.href || (url.pathname === location.pathname && url.search === location.search && url.hash))return;
      event.preventDefault();event.stopPropagation();
      if(!current.current.busy) void attemptLeave(()=>window.location.assign(url.href));
    };
    const navigate = (event: Event) => {
      if (!current.current.dirty && !current.current.busy) return;
      event.preventDefault();
      if (!current.current.busy) {
        void attemptLeave((event as CustomEvent<() => void>).detail);
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
  },[guardNavigation,titleId,leave,attemptLeave]);
  useEffect(()=>{
    if(!guardNavigation || completing.current)return;
    if((dirty || busy) && !historyGuard.current){historyGuard.current=true;window.history.pushState({...window.history.state,rcmEditorGuard:titleId},'',location.href);}
    if(!dirty && !busy && !leaving.current && historyGuard.current && window.history.state?.rcmEditorGuard === titleId){
      const href = window.location.href;
      historyGuard.current=false;
      afterPop.current=()=>window.history.replaceState(window.history.state,"",href);
      window.history.back();
    }
  },[dirty,busy,guardNavigation,titleId]);
  useEffect(() => {
    if (presentation === "page") return;
    const dialog = ref.current!;
    const focus = document.activeElement;
    dialog.showModal();
    const unlock = lockModalScroll();
    return () => {
      dialog.close();
      unlock();
      if (focus instanceof HTMLElement && focus.isConnected) focus.focus({ preventScroll: true });
    };
  }, [presentation]);
  useEffect(() => {
    if (!toastId) return;
    return () => {
      toast.getToasts().filter(notification => "toasterId" in notification && notification.toasterId === toastId)
        .forEach(notification => toast.dismiss(notification.id));
    };
  }, [toastId]);
  useEffect(() => {
    const surface = presentation === "page" ? pageRef.current : ref.current;
    if (!toastId || !surface) return;
    if (!footerRef.current) { surface.style.setProperty("--editor-actions-height", "0px"); return; }
    const footer = footerRef.current;
    const update = () => surface.style.setProperty("--editor-actions-height", `${footer.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    return () => observer.disconnect();
  }, [toastId, actions, presentation]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => { if (completing.current) return; event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, busy]);
  const requestClose = () => {
    if (busy) return;
    if (dirty) void attemptLeave(onClose);
    else leave(onClose);
  };
  const content = <>
      {presentation === "page" && showBack ? <Button type="button" variant="ghost" className={styles.back} reserveLabelSpace={false} disabled={busy} onClick={requestClose}>
        <Icon name="chevron-left" size={18} />{backLabel}
      </Button> : null}
      <header className={styles.header} data-editor-header>
        <div className={styles.heading}>
          {headerMeta ? <div className={styles.headerMeta}>{headerMeta}</div> : null}
          <h1 id={titleId}>{title}</h1>
          {subtitle ? <div className={styles.subtitle} title={typeof subtitle === "string" ? subtitle : undefined}>{subtitle}</div> : null}
        </div>
        {headerActions ? <div className={styles.headerActions}>{headerActions}</div> : null}
        {presentation === "dialog" ? <Button variant="ghost" className={styles.close} aria-label={closeLabel} disabled={busy} onClick={requestClose}><Icon name="x" /></Button> : null}
      </header>
      {navigation ? <div className={styles.navigation} data-editor-navigation>{navigation}</div> : null}
      <div className={styles.body} data-editor-body>{children}</div>
      {actions ? <footer ref={footerRef} className={styles.footer} data-editor-actions>{actions}</footer> : null}
      {toastId ? <RcmToaster id={toastId} /> : null}
    </>;
  return <>
    {presentation === "page" ? <section ref={pageRef} className={`${styles.page} ${className}`} data-editor-page
      onBlurCapture={onFieldBlur}
      aria-labelledby={titleId} aria-busy={busy || undefined}>{content}</section> :
      <dialog ref={ref} className={`${styles.surface} ${compact ? styles.compact : ""} ${centered ? styles.centered : ""} ${className}`}
        onBlurCapture={onFieldBlur}
        role="dialog" aria-labelledby={titleId} aria-busy={busy || undefined}
        onCancel={(event) => { event.preventDefault(); event.stopPropagation(); if(event.target === event.currentTarget) requestClose(); }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) requestClose();
        }}>{content}</dialog>}
    {confirmClose ? <Dialog title="Есть несохранённые изменения" onClose={() => setConfirmClose(false)}
      actions={<><Button variant="secondary" onClick={() => setConfirmClose(false)}>Вернуться к редактированию</Button><Button variant="primary" onClick={() => { setConfirmClose(false); const action=leaveAction.current ?? onClose; leaveAction.current=null; onDiscard?.(); leave(action); }}>Закрыть без сохранения</Button></>}>
      <p>Если закрыть сейчас, внесённые изменения не сохранятся</p>{discardHint && <p>{discardHint}</p>}
    </Dialog> : null}
  </>;
}
