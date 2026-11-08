"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { ProductSearch } from "../ui/ProductSearch";
import { isBuyerSearchEntry } from "./BuyerSearchDialog";

const historyKey = "rcmBuyerSearch";

/** The compact header search retains the mobile Back/Forward behavior of the former dialog. */
export function BuyerSearchInline({ initialQuery, onClose, onSearch, onProduct, className, closeClassName }: {
  initialQuery: string; onClose: () => void; onSearch: (query: string) => void; onProduct: (href: string) => void;
  className: string; closeClassName: string;
}) {
  const token = useRef(useId());
  const [closing, setClosing] = useState(false);
  const requested = useRef(false);
  const afterBack = useRef<(() => void) | null>(null);
  const entry = useRef({ owned: false, version: 0, url: "" });
  const closeCallback = useRef(onClose);
  useEffect(() => { closeCallback.current = onClose; }, [onClose]);
  useEffect(() => {
    const currentEntry = entry.current;
    const version = ++currentEntry.version;
    currentEntry.url = window.location.href;
    if (isBuyerSearchEntry(window.history.state)) token.current = window.history.state[historyKey];
    const ownsCurrent = () => window.history.state?.[historyKey] === token.current && window.location.href === currentEntry.url;
    if (!ownsCurrent()) window.history.pushState({ ...window.history.state, [historyKey]: token.current }, "", currentEntry.url);
    currentEntry.owned = true;
    const onPop = () => {
      if (!currentEntry.owned || ownsCurrent()) return;
      currentEntry.owned = false;
      const action = afterBack.current ?? closeCallback.current;
      afterBack.current = null;
      queueMicrotask(action);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      queueMicrotask(() => {
        if (currentEntry.version !== version || !currentEntry.owned || !ownsCurrent()) return;
        currentEntry.owned = false;
        window.history.back();
      });
    };
  }, []);

  function leave(action: () => void) {
    if (requested.current) return;
    requested.current = true; setClosing(true);
    if (entry.current.owned && window.history.state?.[historyKey] === token.current && window.location.href === entry.current.url) {
      afterBack.current = action; window.history.back();
    } else action();
  }
  return <div className={className} aria-busy={closing}>
    <ProductSearch initialQuery={initialQuery} autoFocus onEscape={() => leave(onClose)}
      onSearch={query => leave(() => onSearch(query))} onProduct={href => leave(() => onProduct(href))} />
    <button type="button" className={closeClassName} aria-label="Закрыть поиск" disabled={closing}
      onClick={() => leave(onClose)}><Icon name="x" size={24} /></button>
  </div>;
}
