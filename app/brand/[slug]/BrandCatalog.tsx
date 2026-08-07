"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import type { CatalogProduct } from "../../components/Catalog/catalogTypes";
import { normalizeProducts } from "../../components/Catalog/catalogUtils";
import { ProductTile } from "../../components/ProductTile/ProductTile";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import { API_URL } from "../../lib/api";

import styles from "./BrandPage.module.css";

type Props = {
  products: CatalogProduct[];
  brandSlug: string;
  initialPage: number;
  totalPages: number;
  totalProducts: number;
};

export function BrandCatalog({
  products: initialProducts,
  brandSlug,
  initialPage,
  totalPages,
  totalProducts,
}: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  async function loadMore() {
    const nextPage = page + 1;
    if (loadingMoreRef.current || nextPage >= totalPages) return;

    try {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const response = await fetch(
        `${API_URL}/api/products/brand/${encodeURIComponent(brandSlug)}?page=${nextPage}&size=48`,
        { cache: "no-store", credentials: "include" }
      );
      if (!response.ok) throw new Error("brand products request failed");

      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("content" in data)) {
        throw new Error("invalid brand products response");
      }

      const payload = data as { content?: unknown; number?: unknown };
      const nextProducts = normalizeProducts(payload.content);

      setProducts((current) => {
        const knownIds = new Set(current.map((product) => product.id));
        return [
          ...current,
          ...nextProducts.filter((product) => !knownIds.has(product.id)),
        ];
      });
      setPage(typeof payload.number === "number" ? payload.number : nextPage);
    } catch {
      toast.error("Не удалось загрузить ещё товары");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  return (
    <section className={styles.results}>
      <div className={styles.catalogHeader}>
        <h2>Товары</h2>
        <span className={styles.count}>{totalProducts.toLocaleString("ru-RU")}</span>
      </div>

      <ul className={styles.grid} aria-live="polite">
        {products.map((product) => (
          <ProductTile
            key={product.id}
            product={{
              id: product.id,
              publicId: product.publicId,
              title: product.title,
              brand: product.brand,
              brandSlug: product.brandSlug,
              images: product.images,
              minPrice: product.minPrice,
            }}
          />
        ))}
      </ul>

      <ListLoadMore
        loaded={products.length}
        total={totalProducts}
        loading={loadingMore}
        onLoadMore={page + 1 < totalPages ? loadMore : undefined}
      />
    </section>
  );
}
