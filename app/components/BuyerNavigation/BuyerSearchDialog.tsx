"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { TextInput } from "../ui/TextInput";
import { MobilePanelHeader } from "./MobilePanelHeader";
import { catalogSearchLimitMessage, hasTooManyCatalogSearchTerms, normalizeCatalogSearch } from "../../lib/catalogSearch";
import styles from "./BuyerSearchDialog.module.css";

const mobileQuery = "(max-width: 640px)";
function subscribeViewport(onChange: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const isMobile = () => window.matchMedia(mobileQuery).matches;
const serverSnapshot = () => false;
const historyKey = "rcmBuyerSearch";

export function isBuyerSearchEntry(state: unknown): state is Record<typeof historyKey, string> {
  return typeof state === "object" && state !== null && Object.prototype.hasOwnProperty.call(state, historyKey) &&
    typeof (state as Record<string, unknown>)[historyKey] === "string";
}

export function BuyerSearchDialog({ initialQuery, onClose, onSearch }: {
  initialQuery: string;
  onClose: () => void;
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [invalidSearch, setInvalidSearch] = useState(false);
  const mobile = useSyncExternalStore(subscribeViewport, isMobile, serverSnapshot);
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const historyToken = useRef(formId);
  const [closing, setClosing] = useState(false);
  const closeRequested = useRef(false);
  const afterBack = useRef<(() => void) | null>(null);
  const historyEntry = useRef({ owned: false, version: 0, url: "" });
  const closeCallback = useRef(onClose);

  useEffect(() => {
    // Wait for Dialog.showModal and a possible move into the mobile header.
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [mobile]);
  useEffect(() => { closeCallback.current = onClose; }, [onClose]);
  useEffect(() => {
    const entry = historyEntry.current;
    const version = ++entry.version;
    entry.url = window.location.href;
    const current = window.history.state;
    // A Forward/reload mount adopts its existing entry without adding another one.
    if (isBuyerSearchEntry(current)) historyToken.current = current[historyKey];
    const token = historyToken.current;
    const ownsCurrentEntry = () => window.history.state?.[historyKey] === token && window.location.href === entry.url;
    if (!ownsCurrentEntry()) window.history.pushState({ ...window.history.state, [historyKey]: token }, "", entry.url);
    entry.owned = true;

    const onPop = () => {
      if (!entry.owned || ownsCurrentEntry()) return;
      entry.owned = false;
      const action = afterBack.current ?? closeCallback.current;
      afterBack.current = null;
      queueMicrotask(action);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // StrictMode immediately mounts again; only the final unmount removes its entry.
      queueMicrotask(() => {
        if (entry.version !== version || !entry.owned || !ownsCurrentEntry()) return;
        entry.owned = false;
        window.history.back();
      });
    };
  }, [formId]);

  function leave(action: () => void) {
    if (closeRequested.current) return;
    closeRequested.current = true;
    setClosing(true);
    const entry = historyEntry.current;
    if (entry.owned && window.history.state?.[historyKey] === historyToken.current && window.location.href === entry.url) {
      afterBack.current = action;
      window.history.back();
    } else action();
  }
  function close() { leave(onClose); }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = normalizeCatalogSearch(query);
    if (hasTooManyCatalogSearchTerms(value)) { setInvalidSearch(true); inputRef.current?.focus(); return; }
    if (value) leave(() => onSearch(value));
  }

  const searchForm = <form id={formId} role="search" className={mobile ? styles.mobileForm : undefined} onSubmit={submit}>
    <TextInput ref={inputRef} label="Название или артикул" hideLabel={mobile} placeholder={mobile ? "Название или артикул" : undefined}
      type="search" name="q" value={query} required disabled={closing} maxLength={120} autoFocus enterKeyHint="search"
      error={invalidSearch ? catalogSearchLimitMessage : undefined}
      onChange={event => { setQuery(event.target.value); setInvalidSearch(false); }} />
  </form>;

  return <Dialog title="Поиск" className={styles.dialog} onClose={close} busy={closing}
    mobileHeader={mobile ? <MobilePanelHeader onBack={close} onClose={close} busy={closing}>{searchForm}</MobilePanelHeader> : undefined}
    actions={<Button type="submit" form={formId} className={styles.submit} disabled={closing || !query.trim()}>Найти</Button>}>
    {mobile ? null : searchForm}
  </Dialog>;
}
