"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "../ProductCard/ProductCard";
import { SkeletonCard } from "../SkeletonCard/SkeletonCard";
import styles from "./Catalog.module.css";
import { apiFetch } from "../../lib/api";

type Variant = {
  price: number;
};

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

  // ✅ категория из URL
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category") ?? "";

  useEffect(() => {
    const start = Date.now();

    apiFetch("http://localhost:9696/api/products")
      .then((r: Response) => r.json())
      .then((data: Product[]) => {
        setProducts(data);

        const elapsed = Date.now() - start;
        const minDelay = 400;

        setTimeout(
          () => setLoading(false),
          Math.max(minDelay - elapsed, 0)
        );
      });
  }, []);

  const brands = Array.from(new Set(products.map((p) => p.brand)));

  const filteredProducts = products.filter((p) => {
    const minPrice = Math.min(...p.variants.map((v) => v.price));

    if (selectedCategory && p.category !== selectedCategory) return false;
    if (selectedBrand && p.brand !== selectedBrand) return false;
    if (priceFrom && minPrice < Number(priceFrom)) return false;
    if (priceTo && minPrice > Number(priceTo)) return false;

    return true;
  });

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* FILTERS */}
        <div className={styles.filters}>
          <select
            className={styles.filterControl}
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="">Все бренды</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <input
            className={styles.filterControl}
            type="number"
            placeholder="Цена от"
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
          />

          <input
            className={styles.filterControl}
            type="number"
            placeholder="Цена до"
            value={priceTo}
            onChange={(e) => setPriceTo(e.target.value)}
          />

          <button
            className={styles.filterControl}
            onClick={() => {
              setSelectedBrand("");
              setPriceFrom("");
              setPriceTo("");
            }}
          >
            Сбросить
          </button>
        </div>

        {/* GRID */}
        <div className={styles.grid}>
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            : filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      </div>
    </div>
  );
}
