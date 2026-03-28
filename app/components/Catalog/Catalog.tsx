"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./Catalog.module.css";
import { apiFetch, API_URL } from "../../lib/api";
import { ProductTile } from "../ProductTile/ProductTile";
import { SkeletonTile } from "../SkeletonTile/SkeletonTile";

type Variant = { price: number };
type Audience = "MEN" | "WOMEN" | "UNISEX";

type Product = {
  id: number;
  title: string;
  brand: string;
  category: string;
  audience: Audience;
  images: string[];
  variants: Variant[];
};

type SortValue = "newest" | "price-asc" | "price-desc" | "brand-asc";

const audienceLabels: Record<string, string> = {
  men: "Для него",
  women: "Для нее",
  all: "Для всех",
};

function getMinPrice(product: Product): number {
  const prices = product.variants
    .map((v) => v.price)
    .filter((x) => typeof x === "number");
  return prices.length ? Math.min(...prices) : 0;
}

function normalizeAudience(value: string | null): "men" | "women" | "all" {
  if (value === "men" || value === "women") return value;
  return "all";
}

function matchesAudience(
  productAudience: Audience,
  selectedAudience: "men" | "women" | "all"
) {
  if (selectedAudience === "all") return true;
  if (selectedAudience === "men") {
    return productAudience === "MEN" || productAudience === "UNISEX";
  }
  if (selectedAudience === "women") {
    return productAudience === "WOMEN" || productAudience === "UNISEX";
  }
  return true;
}

function buildCatalogTitle(
  category: string,
  selectedAudience: "men" | "women" | "all"
) {
  if (!category) {
    if (selectedAudience === "men") return "Все товары для мужчин";
    if (selectedAudience === "women") return "Все товары для женщин";
    return "Все товары";
  }

  if (selectedAudience === "men") return `${category} для мужчин`;
  if (selectedAudience === "women") return `${category} для женщин`;
  return category;
}

export function Catalog() {
  const searchParams = useSearchParams();

  const selectedCategory = searchParams.get("category") ?? "";
  const selectedAudience = normalizeAudience(searchParams.get("audience"));
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();
  const initialBrand = searchParams.get("brand") ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("newest");

  useEffect(() => {
    setSelectedBrand(initialBrand);
  }, [initialBrand]);

  useEffect(() => {
    const start = Date.now();

    apiFetch(`${API_URL}/api/products`)
      .then((r) => r.json())
      .then((data: Product[]) => {
        setProducts(Array.isArray(data) ? data : []);

        const elapsed = Date.now() - start;
        const minDelay = 350;
        setTimeout(() => setLoading(false), Math.max(minDelay - elapsed, 0));
      })
      .catch(() => setLoading(false));
  }, []);

  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => p.brand)
            .filter(
              (b): b is string =>
                typeof b === "string" && b.trim().length > 0
            )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const filtered = useMemo(() => {
    const base = products.filter((p) => {
      const minPrice = getMinPrice(p);

      if (!matchesAudience(p.audience, selectedAudience)) return false;
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedBrand && p.brand !== selectedBrand) return false;
      if (priceFrom && minPrice < Number(priceFrom)) return false;
      if (priceTo && minPrice > Number(priceTo)) return false;

      if (searchQuery) {
        const haystack = `${p.title} ${p.brand} ${p.category}`.toLowerCase();
        if (!haystack.includes(searchQuery)) return false;
      }

      return true;
    });

    const sorted = [...base];

    switch (sortBy) {
      case "price-asc":
        sorted.sort((a, b) => getMinPrice(a) - getMinPrice(b));
        break;
      case "price-desc":
        sorted.sort((a, b) => getMinPrice(b) - getMinPrice(a));
        break;
      case "brand-asc":
        sorted.sort((a, b) => a.brand.localeCompare(b.brand));
        break;
      case "newest":
      default:
        sorted.sort((a, b) => b.id - a.id);
        break;
    }

    return sorted;
  }, [
    products,
    selectedAudience,
    selectedCategory,
    selectedBrand,
    priceFrom,
    priceTo,
    searchQuery,
    sortBy,
  ]);

  const hasFilters = Boolean(selectedBrand || priceFrom || priceTo);

  const breadcrumbAudienceLabel = audienceLabels[selectedAudience];
  const pageTitle = buildCatalogTitle(selectedCategory, selectedAudience);

  function resetFilters() {
    setSelectedBrand("");
    setPriceFrom("");
    setPriceTo("");
    setSortBy("newest");
  }

  return (
    <div className={styles.catalogPage}>
      <div className={styles.catalogTop}>
        <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
          <ol className={styles.breadcrumbList}>
            <li className={styles.breadcrumbItem}>
              <Link
                href={
                  selectedAudience === "all"
                    ? "/catalog"
                    : `/catalog?audience=${encodeURIComponent(selectedAudience)}`
                }
                className={styles.breadcrumbLink}
              >
                {breadcrumbAudienceLabel}
              </Link>
            </li>

            {selectedCategory && (
              <li className={styles.breadcrumbItem}>
                <span className={styles.breadcrumbCurrent}>
                  {selectedCategory}
                </span>
              </li>
            )}
          </ol>
        </nav>

        <div className={styles.headingWrap}>
          <h1 className={styles.heading}>{pageTitle}</h1>
        </div>
      </div>

      <div className={styles.catalogActions}>
        <aside className={styles.filters}>
          <label className={styles.field}>
            <select
              className={styles.control}
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              <option value="">Бренд</option>
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

        <div className={styles.sortWrap}>
          <label className={styles.sortLabel}>
            <span className={styles.sortText}>Сортировка</span>
            <select
              className={styles.sortControl}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortValue)}
            >
              <option value="newest">Сначала новые</option>
              <option value="price-asc">Цена: по возрастанию</option>
              <option value="price-desc">Цена: по убыванию</option>
              <option value="brand-asc">По бренду</option>
            </select>
          </label>
        </div>
      </div>

      <section className={styles.results}>
        <div className={styles.resultsBar}>
          <div className={styles.count}>
            {loading ? "Загрузка…" : `${filtered.length} товаров`}
          </div>
        </div>

        <ul className={styles.grid} aria-busy={loading}>
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))
            : filtered.map((p) => (
                <ProductTile
                  key={p.id}
                  product={{
                    id: p.id,
                    title: p.title,
                    brand: p.brand,
                    images: p.images,
                    minPrice: getMinPrice(p),
                  }}
                />
              ))}
        </ul>
      </section>
    </div>
  );
}