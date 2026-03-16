"use client";

import { useEffect, useState } from "react";
import styles from "./Favorites.module.css";
import { apiFetch, API_URL } from "../lib/api";
import { ProductTile } from "../components/ProductTile/ProductTile";

type Product = {
  id: number;
  title: string;
  brand: string | null;
  category: string | null;
  images: string[];
  minPrice: number;
};

export default function FavoritesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    apiFetch(`${API_URL}/api/favorites`)
      .then((r) => {
        if (!r.ok) throw new Error("favorites load failed");
        return r.json();
      })
      .then((data: Product[]) => {
        if (!alive) return;
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!alive) return;
        setProducts([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
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