"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { API_URL } from "../../lib/api";
import { catalogSearchLimitMessage, hasTooManyCatalogSearchTerms, normalizeCatalogSearch } from "../../lib/catalogSearch";
import { productPath } from "../../lib/productUrls";
import { ProductPhoto } from "../ProductPhoto";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { Loader } from "./Loader";
import { Price } from "./Price";
import { TextInput } from "./TextInput";
import styles from "./ProductSearch.module.css";

export type SearchProduct = { id: number; publicId?: string | null; title: string; brand?: string | null; coverImage?: string | null; minPrice?: number | null };
type LoadSuggestions = (query: string, signal: AbortSignal) => Promise<SearchProduct[]>;

async function loadCatalogSuggestions(query: string, signal: AbortSignal): Promise<SearchProduct[]> {
  const params = new URLSearchParams({ q: query, page: "0", size: "5" });
  const response = await fetch(`${API_URL}/api/products/page?${params}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Search unavailable");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("content" in data) || !Array.isArray(data.content)) throw new Error("Invalid search response");
  return data.content.map((item: unknown): SearchProduct => {
    if (!item || typeof item !== "object" || !("id" in item) || !Number.isSafeInteger(item.id) || Number(item.id) <= 0 ||
        !("title" in item) || typeof item.title !== "string" || !item.title.trim()) throw new Error("Invalid product");
    const product = item as Record<string, unknown>;
    return { id: Number(product.id), title: String(product.title),
      publicId: typeof product.publicId === "string" ? product.publicId : null,
      brand: typeof product.brand === "string" ? product.brand : null,
      coverImage: typeof product.coverImage === "string" && product.coverImage ? product.coverImage : null,
      minPrice: typeof product.minPrice === "number" && Number.isFinite(product.minPrice) ? product.minPrice : null };
  });
}

export function ProductSearch({ initialQuery = "", onSearch, onProduct, onEscape, onDismiss, onQueryChange, escapeClosesSearch = false, autoFocus = false,
  loadSuggestions = loadCatalogSuggestions }: {
  initialQuery?: string;
  onSearch: (query: string) => void;
  onProduct: (href: string) => void;
  onEscape?: () => void;
  onDismiss?: () => void;
  onQueryChange?: (query: string) => void;
  escapeClosesSearch?: boolean;
  autoFocus?: boolean;
  loadSuggestions?: LoadSuggestions;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "error"; items: SearchProduct[] }>({ status: "idle", items: [] });
  const [active, setActive] = useState(-1);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLFormElement>(null);
  const listId = useId();
  const normalized = normalizeCatalogSearch(query);
  const eligible = Array.from(normalized.trim()).length >= 2 && !hasTooManyCatalogSearchTerms(normalized);

  function invalidate() {
    generation.current++;
    request.current?.abort();
    request.current = null;
  }

  useEffect(() => {
    if (!open || !eligible || composing) return;
    const controller = new AbortController();
    request.current = controller;
    const version = ++generation.current;
    const timer = window.setTimeout(() => {
      setState({ status: "loading", items: [] });
      void loadSuggestions(normalized, controller.signal).then(items => {
        if (!controller.signal.aborted && version === generation.current) setState({ status: "ready", items });
      }).catch(() => {
        if (!controller.signal.aborted && version === generation.current) setState({ status: "error", items: [] });
      });
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, eligible, composing, normalized, loadSuggestions]);

  useEffect(() => {
    if (!onDismiss) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      generation.current++;
      request.current?.abort();
      request.current = null;
      setOpen(false);
      setActive(-1);
      onDismiss?.();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [onDismiss]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (composing) return;
    if (hasTooManyCatalogSearchTerms(normalized)) { setInvalid(true); invalidate(); setOpen(false); input.current?.focus(); return; }
    if (!normalized.trim()) return;
    if (open && active >= 0 && state.status === "ready" && state.items[active]) {
      invalidate(); setOpen(false); onProduct(productPath(state.items[active])); return;
    }
    invalidate(); setOpen(false); onSearch(normalized);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || composing) return;
    if (event.key === "Escape") {
      if (escapeClosesSearch && onEscape) { event.preventDefault(); invalidate(); onEscape(); }
      else if (open) { event.preventDefault(); invalidate(); setOpen(false); setActive(-1); }
      else onEscape?.();
    } else if (!open && eligible && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault(); setOpen(true);
    } else if (open && state.status === "ready" && state.items.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setActive(index => event.key === "ArrowDown" ? (index + 1) % state.items.length : (index <= 0 ? state.items.length - 1 : index - 1));
    }
  }

  const expanded = open && eligible && !composing && state.status !== "idle";
  return <form ref={root} role="search" className={styles.root} onSubmit={submit} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { invalidate(); setOpen(false); setActive(-1); onDismiss?.(); }
  }}>
    <div className={styles.control} data-expanded={expanded || undefined}>
      <TextInput ref={input} label="Поиск товаров" hideLabel type="search" name="q" placeholder="Поиск товаров"
        autoFocus={autoFocus} autoComplete="off" enterKeyHint="search" maxLength={120} value={query}
        role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        error={invalid ? catalogSearchLimitMessage : undefined}
        trailing={<Button type="submit" variant="utility" iconOnly aria-label="Найти"><Icon name="search" size={20} /></Button>}
        onFocus={() => { setOpen(true); setActive(-1); }}
        onChange={event => { invalidate(); setQuery(event.target.value); onQueryChange?.(event.target.value); setInvalid(false); setActive(-1); setState({ status: "idle", items: [] }); setOpen(true); }}
        onCompositionStart={() => { invalidate(); setComposing(true); setState({ status: "idle", items: [] }); }}
        onCompositionEnd={() => setComposing(false)} onKeyDown={keyDown} />
      {expanded ? <><span className={styles.bridge} aria-hidden="true" /><div className={styles.menu}>
        {state.status === "loading" ? <div className={styles.message}><Loader inline label="Загрузка подсказок" /><span>Ищем товары</span></div> : null}
        {state.status === "error" ? <div className={styles.message} role="status">Не удалось загрузить подсказки</div> : null}
        {state.status === "ready" && !state.items.length ? <div className={styles.message} role="status">Товары не найдены</div> : null}
        <div id={listId} role="listbox" aria-label="Подсказки товаров" aria-busy={state.status === "loading" || undefined}>
          {state.items.map((item, index) => <Link key={item.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}
            tabIndex={-1} className={styles.option} href={productPath(item)} onMouseDown={event => event.preventDefault()}
            onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); invalidate(); setOpen(false); onProduct(productPath(item)); } }}>
            {item.coverImage ? <span className={styles.image}><ProductPhoto src={item.coverImage} alt="" sizes="48px" /></span> : <span className={styles.imagePlaceholder} aria-hidden="true" />}
            <span className={styles.info}><span>{item.title}</span>{item.brand ? <span className={styles.brand}>{item.brand}</span> : null}</span>
            {item.minPrice != null && item.minPrice > 0 ? <Price amount={item.minPrice} className={styles.price} /> : null}
          </Link>)}
        </div>
      </div></> : null}
    </div>
  </form>;
}
