"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./Catalog.module.css";
import { apiFetch, API_URL } from "../../lib/api";
import { ProductTile } from "../ProductTile/ProductTile";
import { SkeletonTile } from "../SkeletonTile/SkeletonTile";
import { ChevronDownIcon } from "../icons/ChevronDownIcon";

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

type SortValue = "" | "newest" | "price-asc" | "price-desc";

const audienceLabels: Record<string, string> = {
  men: "Для него",
  women: "Для нее",
  all: "Для всех",
};

const sortLabels: Record<Exclude<SortValue, "">, string> = {
  newest: "Новинки",
  "price-asc": "По возрастанию цены",
  "price-desc": "По убыванию цены",
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
  const [sortBy, setSortBy] = useState<SortValue>("");
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const brandsDropdownRef = useRef<HTMLDivElement | null>(null);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        brandsDropdownRef.current &&
        !brandsDropdownRef.current.contains(target)
      ) {
        setBrandsOpen(false);
      }

      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(target)
      ) {
        setSortOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const visibleBrands = useMemo(() => brands.slice(0, 8), [brands]);

  const filtered = useMemo(() => {
    const base = products.filter((p) => {
      if (!matchesAudience(p.audience, selectedAudience)) return false;
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedBrand && p.brand !== selectedBrand) return false;

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
      case "newest":
        sorted.sort((a, b) => b.id - a.id);
        break;
      default:
        break;
    }

    return sorted;
  }, [products, selectedAudience, selectedCategory, selectedBrand, searchQuery, sortBy]);

  const breadcrumbAudienceLabel = audienceLabels[selectedAudience];
  const pageTitle = buildCatalogTitle(selectedCategory, selectedAudience);

  function toggleBrand(brand: string) {
    setSelectedBrand((prev) => (prev === brand ? "" : brand));
    setBrandsOpen(false);
  }

  function resetBrandFilter() {
    setSelectedBrand("");
    setBrandsOpen(false);
  }

  function toggleBrandsDropdown() {
    setBrandsOpen((prev) => !prev);
    setSortOpen(false);
  }

  function toggleSortDropdown() {
    setSortOpen((prev) => !prev);
    setBrandsOpen(false);
  }

  function selectSort(value: Exclude<SortValue, "">) {
    setSortBy((prev) => (prev === value ? "" : value));
    setSortOpen(false);
  }

  const sortButtonText = sortBy ? sortLabels[sortBy] : "Сортировка";

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
        <div className={styles.chipsRow}>
          <div className={styles.dropdownWrap} ref={brandsDropdownRef}>
            <button
              type="button"
              className={`${styles.chip} ${styles.dropdownChip} ${
                !selectedBrand ? styles.chipActive : ""
              }`}
              onClick={toggleBrandsDropdown}
            >
              <span>Все</span>
            <ChevronDownIcon className={styles.chevron} />
            </button>

            {brandsOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  type="button"
                  className={`${styles.dropdownItem} ${
                    !selectedBrand ? styles.dropdownItemActive : ""
                  }`}
                  onClick={resetBrandFilter}
                >
                  Все бренды
                </button>

                {brands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    className={`${styles.dropdownItem} ${
                      selectedBrand === brand ? styles.dropdownItemActive : ""
                    }`}
                    onClick={() => toggleBrand(brand)}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.quickFilters} aria-label="Бренды">
            {visibleBrands.map((brand) => (
              <button
                key={brand}
                type="button"
                className={`${styles.chip} ${
                  selectedBrand === brand ? styles.chipActive : ""
                }`}
                onClick={() => toggleBrand(brand)}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.sortWrap} ref={sortDropdownRef}>
          <button
            type="button"
            className={styles.sortButton}
            onClick={toggleSortDropdown}
          >
            <span className={styles.sortButtonText}>{sortButtonText}</span>
            <ChevronDownIcon className={styles.chevron} />
          </button>

          {sortOpen && (
            <div className={styles.sortMenu}>
              <button
                type="button"
                className={`${styles.dropdownItem} ${
                  sortBy === "price-desc" ? styles.dropdownItemActive : ""
                }`}
                onClick={() => selectSort("price-desc")}
              >
                По убыванию цены
              </button>

              <button
                type="button"
                className={`${styles.dropdownItem} ${
                  sortBy === "price-asc" ? styles.dropdownItemActive : ""
                }`}
                onClick={() => selectSort("price-asc")}
              >
                По возрастанию цены
              </button>

              <button
                type="button"
                className={`${styles.dropdownItem} ${
                  sortBy === "newest" ? styles.dropdownItemActive : ""
                }`}
                onClick={() => selectSort("newest")}
              >
                Новинки
              </button>
            </div>
          )}
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