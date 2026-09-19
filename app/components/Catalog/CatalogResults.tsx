"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import { API_URL } from "../../lib/api";
import { ProductTile } from "../ProductTile/ProductTile";
import { EmptyState } from "../ui/EmptyState";
import type { CatalogProduct, CatalogProductsQuery } from "./catalogTypes";
import { buildCatalogProductsQuery, normalizeProducts } from "./catalogUtils";
import styles from "./Catalog.module.css";

type LoadedPage = { products: CatalogProduct[]; page: number; totalPages: number; savedAt: number };
const emptyLoadedPage: LoadedPage = { products: [], page: 0, totalPages: 0, savedAt: 0 };
// Keep appended pages on Back from a product, without changing the canonical URL
// or affecting the server-rendered desktop page. No customer data is stored.
const loadedPages = new Map<string, LoadedPage>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const serverSnapshot = () => emptyLoadedPage;

function saveLoadedPage(key: string, page: LoadedPage) {
  for (const [cachedKey, cachedPage] of loadedPages) {
    if (page.savedAt - cachedPage.savedAt > 5 * 60_000) loadedPages.delete(cachedKey);
  }
  loadedPages.delete(key);
  loadedPages.set(key, page);
  if (loadedPages.size > 6) loadedPages.delete(loadedPages.keys().next().value!);
  listeners.forEach((listener) => listener());
}

export function CatalogResults({
  products,
  query,
  totalPages,
  totalProducts,
  hasError,
  firstPageHref,
}: {
  products: CatalogProduct[];
  query: CatalogProductsQuery;
  totalPages: number;
  totalProducts: number;
  hasError: boolean;
  firstPageHref: string;
}) {
  const cacheKey = `${buildCatalogProductsQuery(query)}|${totalProducts}|${products.map((item) => item.id).join(",")}`;
  const loaded = useSyncExternalStore(
    subscribe,
    () => loadedPages.get(cacheKey) ?? emptyLoadedPage,
    serverSnapshot
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const firstPageIds = new Set(products.map((product) => product.id));
  const addedProducts = loaded.products.filter((product) => !firstPageIds.has(product.id));
  const lastPage = loaded.page || query.page;
  const availablePages = loaded.page ? loaded.totalPages : totalPages;
  const hasMore = lastPage < availablePages;

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function loadMore() {
    if (controllerRef.current || !hasMore) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setLoadError(false);
    try {
      const nextPage = lastPage + 1;
      const response = await fetch(`${API_URL}/api/products/page?${buildCatalogProductsQuery({ ...query, page: nextPage })}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Catalog page unavailable");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object") throw new Error("Invalid catalog page");
      const page = data as { content?: unknown; totalPages?: unknown; number?: unknown };
      if (!Array.isArray(page.content) || typeof page.totalPages !== "number" || page.number !== nextPage - 1) {
        throw new Error("Invalid catalog page");
      }
      const unique = new Map(loaded.products.map((product) => [product.id, product]));
      normalizeProducts(page.content).forEach((product) => {
        if (!firstPageIds.has(product.id)) unique.set(product.id, product);
      });
      if (controller.signal.aborted) return;
      saveLoadedPage(cacheKey, { products: [...unique.values()], page: nextPage, totalPages: page.totalPages, savedAt: Date.now() });
    } catch {
      if (!controller.signal.aborted) setLoadError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      controllerRef.current = null;
    }
  }

  return (
    <section className={styles.results} aria-label="Товары">
      {products.length > 0 ? (
        <ul className={styles.grid}>
          {products.map((product) => <ProductTile key={product.id} product={product} />)}
        </ul>
      ) : (
        <EmptyState
          icon={hasError ? "alert" : "search"}
          tone={hasError ? "danger" : "default"}
          title={hasError ? "Не удалось загрузить каталог" : "Ничего не найдено"}
          text={hasError ? "Попробуйте обновить страницу немного позже." : "Попробуйте изменить категорию или фильтры."}
        />
      )}
      {addedProducts.length > 0 ? (
        <ul className={`${styles.grid} ${styles.mobileAddedProducts}`} aria-label="Дополнительно загруженные товары">
          {addedProducts.map((product) => <ProductTile key={product.id} product={product} />)}
        </ul>
      ) : null}
      {products.length > 0 && (totalPages > 1 || addedProducts.length > 0) ? (
        <div className={styles.mobileLoadMore}>
          {query.page > 1 ? <Link href={firstPageHref} className={styles.loadMoreStart}>К началу списка</Link> : null}
          <p className={styles.loadMoreStatus} role="status">
            {loadError ? "Не удалось загрузить товары. Попробуйте ещё раз." : `Показано ${products.length + addedProducts.length} из ${totalProducts}`}
          </p>
          {hasMore ? (
            <button type="button" className={styles.loadMoreButton} disabled={loading} aria-busy={loading} onClick={loadMore}>
              {loading ? "Загружаем…" : loadError ? "Повторить" : "Показать ещё"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
