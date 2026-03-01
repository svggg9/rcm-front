"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./Catalog.module.css";
import { apiFetch, API_URL } from "../../lib/api";
import { ProductTile } from "../ProductTile/ProductTile";
import { SkeletonTile } from "../SkeletonTile/SkeletonTile";

type Variant = { price: number };

type Product = {
  id: number;
  title: string;
  brand: string;
  category: string;
  images: string[];
  variants: Variant[];
};

export function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBrand, setSelectedBrand] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");

  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category") ?? "";

  useEffect(() => {
    const start = Date.now();

    apiFetch(`${API_URL}/api/products`)
      .then((r) => r.json())
      .then((data: Product[]) => {
        setProducts(data);

        const elapsed = Date.now() - start;
        const minDelay = 350;
        setTimeout(() => setLoading(false), Math.max(minDelay - elapsed, 0));
      })
      .catch(() => setLoading(false));
  }, []);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const minPrice = Math.min(...p.variants.map((v) => v.price));

      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedBrand && p.brand !== selectedBrand) return false;
      if (priceFrom && minPrice < Number(priceFrom)) return false;
      if (priceTo && minPrice > Number(priceTo)) return false;

      return true;
    });
  }, [products, selectedCategory, selectedBrand, priceFrom, priceTo]);

  const hasFilters = Boolean(selectedBrand || priceFrom || priceTo);

  function resetFilters() {
    setSelectedBrand("");
    setPriceFrom("");
    setPriceTo("");
  }

  return (
    <div className={styles.catalog}>
      {/* LEFT / TOP FILTERS */}
      <aside className={styles.filters}>
        <label className={styles.field}>
          <select
            className={styles.control}
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="">Фильтр</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          
          <input
            className={styles.control}
            type="number"
            inputMode="numeric"
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            placeholder="Цена от"
          />
        </label>

        <label className={styles.field}>
          
          <input
            className={styles.control}
            type="number"
            inputMode="numeric"
            value={priceTo}
            onChange={(e) => setPriceTo(e.target.value)}
            placeholder="Цена до"
          />
        </label>

        <button
          className={styles.reset}
          onClick={resetFilters}
          disabled={!hasFilters}
          type="button"
        >
          Сбросить
        </button>
      </aside>

      {/* RESULTS */}
      <section className={styles.results}>
        <div className={styles.resultsBar}>
          <div className={styles.count}>
            {loading ? "Загрузка…" : `${filtered.length} товаров`}
          </div>
        </div>

        <ul className={styles.grid} aria-busy={loading}>
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <SkeletonTile key={i} />)
            : filtered.map((p) => <ProductTile key={p.id} product={p} />)}
        </ul>
      </section>
    </div>
  );
}