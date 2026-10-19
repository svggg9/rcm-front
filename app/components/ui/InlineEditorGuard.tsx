"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

/** Navigation protection for an editor that stays in the page, without a modal surface. */
export function InlineEditorGuard({ dirty, busy, onDiscard }: {
  dirty: boolean; busy: boolean; onDiscard: () => void;
}) {
  const id = useId();
  const current = useRef({ dirty, busy, onDiscard });
  const guard = useRef(false);
  const restoring = useRef(false);
  const completing = useRef(false);
  const afterPop = useRef<(() => void) | null>(null);
  const queuedCompletion = useRef<(() => void) | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { current.current = { dirty, busy, onDiscard }; }, [dirty, busy, onDiscard]);
  const leave = useCallback((action: () => void) => {
    if (guard.current && window.history.state?.rcmInlineEditorGuard === id) {
      afterPop.current = action;
      guard.current = false;
      window.history.back();
    } else action();
  }, [id]);

  useEffect(() => {
    const pop = (event: PopStateEvent) => {
      if (restoring.current && event.state?.rcmInlineEditorGuard === id) {
        restoring.current = false;
        if (queuedCompletion.current) {
          event.stopImmediatePropagation();
          const action = queuedCompletion.current;
          queuedCompletion.current = null;
          leave(action);
          return;
        }
      }
      if (afterPop.current) {
        event.stopImmediatePropagation();
        const action = afterPop.current;
        afterPop.current = null;
        action();
        return;
      }
      if (guard.current && event.state?.rcmInlineEditorGuard !== id) {
        event.stopImmediatePropagation();
        restoring.current = true;
        window.history.forward();
        if (!current.current.busy) {
          pending.current = () => window.history.back();
          setConfirm(true);
        }
      }
    };
    const navigate = (event: Event) => {
      if (!current.current.dirty && !current.current.busy) return;
      event.preventDefault();
      if (!current.current.busy) {
        pending.current = (event as CustomEvent<() => void>).detail;
        setConfirm(true);
      }
    };
    const complete = (event: Event) => {
      event.preventDefault();
      completing.current = true;
      const action = (event as CustomEvent<() => void>).detail;
      if (restoring.current) queuedCompletion.current = action;
      else leave(action);
    };
    const click = (event: MouseEvent) => {
      if (!current.current.dirty && !current.current.busy) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download") || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const url = new URL(link.href);
      if (url.href === location.href || (url.pathname === location.pathname && url.search === location.search && url.hash)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!current.current.busy) {
        pending.current = () => window.location.assign(url.href);
        setConfirm(true);
      }
    };
    window.addEventListener("popstate", pop, true);
    window.addEventListener("rcm-editor-navigation", navigate);
    window.addEventListener("rcm-editor-completion", complete);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("popstate", pop, true);
      window.removeEventListener("rcm-editor-navigation", navigate);
      window.removeEventListener("rcm-editor-completion", complete);
      document.removeEventListener("click", click, true);
    };
  }, [id, leave]);

  useEffect(() => {
    if (completing.current) return;
    if ((dirty || busy) && !guard.current) {
      guard.current = true;
      window.history.pushState({ ...window.history.state, rcmInlineEditorGuard: id }, "", location.href);
    }
    if (!dirty && !busy && guard.current && window.history.state?.rcmInlineEditorGuard === id) {
      guard.current = false;
      afterPop.current = () => {};
      window.history.back();
    }
  }, [dirty, busy, id]);

  useEffect(() => {
    if (!dirty && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, busy]);

  return confirm ? <Dialog title="Есть несохранённые изменения" onClose={() => setConfirm(false)}
    actions={<><Button variant="secondary" onClick={() => setConfirm(false)}>Продолжить редактирование</Button>
      <Button variant="primary" onClick={() => {
        const action = pending.current;
        pending.current = null;
        setConfirm(false);
        leave(() => { current.current.onDiscard(); action?.(); });
      }}>Уйти без сохранения</Button></>}>
    <p>Если уйти сейчас, внесённые изменения не сохранятся</p>
  </Dialog> : null;
}
