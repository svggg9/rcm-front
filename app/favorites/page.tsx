"use client";

import { useEffect, useState } from "react";
import styles from "./Favorites.module.css";
import { apiFetch, API_URL } from "../lib/api";
import { ProductTile } from "../components/ProductTile/ProductTile";
import { getToken } from "../lib/auth";
import { getGuestFavoriteIds } from "../lib/favorites";

type ProductApi = {
  id: number;
  title: string;
  brand: string | null;
  category: string | null;
  images: string[];
  minPrice?: number;
  variants?: Array<{ price: number }>;
};

type ProductTileDto = {
  id: number;
  title: string;
  brand: string | null;
  category: string | null;
  images: string[];
  minPrice: number;
};

function resolveMinPrice(product: ProductApi): number {
  if (typeof product.minPrice === "number") {
    return product.minPrice;
  }

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const prices = product.variants
      .map((v) => v?.price)
      .filter((x): x is number => typeof x === "number");

    if (prices.length > 0) {
      return Math.min(...prices);
    }
  }

  return 0;
}

function toTileProduct(product: ProductApi): ProductTileDto {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand ?? null,
    category: product.category ?? null,
    images: Array.isArray(product.images) ? product.images : [],
    minPrice: resolveMinPrice(product),
  };
}

export default function FavoritesPage() {
  const [products, setProducts] = useState<ProductTileDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      try {
        const token = getToken();

        if (token) {
          const r = await apiFetch(`${API_URL}/api/favorites`);
          if (!r.ok) throw new Error("favorites load failed");

          const data: ProductApi[] = await r.json();

          if (!alive) return;

          setProducts(
            Array.isArray(data) ? data.map(toTileProduct) : []
          );
          return;
        }

        const guestIds = getGuestFavoriteIds();

        if (!guestIds.length) {
          if (!alive) return;
          setProducts([]);
          return;
        }

        const r = await apiFetch(`${API_URL}/api/products`);
        if (!r.ok) throw new Error("products load failed");

        const data: ProductApi[] = await r.json();

        if (!alive) return;

        const idSet = new Set(guestIds);

        const filtered = (Array.isArray(data) ? data : [])
          .filter((p) => idSet.has(p.id))
          .sort((a, b) => guestIds.indexOf(a.id) - guestIds.indexOf(b.id))
          .map(toTileProduct);

        setProducts(filtered);
      } catch {
        if (!alive) return;
        setProducts([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    const handler = () => {
      load();
    };

    window.addEventListener("auth-changed", handler);

    return () => {
      alive = false;
      window.removeEventListener("auth-changed", handler);
    };
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Избранное</h1>

      {loading ? (
        <div className={styles.muted}>Загрузка…</div>
      ) : products.length === 0 ? (
        <div className={styles.muted}>Пока пусто</div>
      ) : (
        <ul className={styles.grid}>
          {products.map((p) => (
            <ProductTile key={p.id} product={p} />
          ))}
        </ul>
      )}
    </div>
  );
}