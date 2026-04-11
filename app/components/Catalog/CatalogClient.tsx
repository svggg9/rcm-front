"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import styles from "./Catalog.module.css";
import { ProductTile } from "../ProductTile/ProductTile";
import { ChevronDownIcon } from "../icons/ChevronDownIcon";

import type {
  CatalogProduct,
  SelectedAudience,
  SortValue,
} from "./catalogTypes";
import {
  audienceLabels,
  buildCatalogQuery,
  getMinPrice,
  sortLabels,
  sortProducts,
} from "./catalogUtils";

type Props = {
  products: CatalogProduct[];
  brands: string[];
  selectedCategory: string;
  selectedAudience: SelectedAudience;
  initialBrand: string;
  searchQuery: string;
  pageTitle: string;
};

export function CatalogClient({
  products,
  brands,
  selectedCategory,
  selectedAudience,
  initialBrand,
  searchQuery,
  pageTitle,
}: Props) {
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

  const visibleBrands = useMemo(() => brands.slice(0, 8), [brands]);

  const visibleProducts = useMemo(() => {
    return sortProducts(products, sortBy);
  }, [products, sortBy]);

  const breadcrumbAudienceLabel = audienceLabels[selectedAudience];
  const sortButtonText = sortBy ? sortLabels[sortBy] : "Сортировка";

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

  return (
    <div className={styles.catalogPage}>
      <div className={styles.catalogTop}>
        <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
          <ol className={styles.breadcrumbList}>
            <li className={styles.breadcrumbItem}>
              <Link
                href={buildCatalogQuery({
                  audience: selectedAudience,
                })}
                className={styles.breadcrumbLink}
              >
                {breadcrumbAudienceLabel}
              </Link>
            </li>

            {selectedCategory ? (
              <li className={styles.breadcrumbItem}>
                <span className={styles.breadcrumbCurrent}>
                  {selectedCategory}
                </span>
              </li>
            ) : null}

            {selectedBrand ? (
              <li className={styles.breadcrumbItem}>
                <span className={styles.breadcrumbCurrent}>{selectedBrand}</span>
              </li>
            ) : null}
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
              <span>{selectedBrand || "Все"}</span>
              <ChevronDownIcon className={styles.chevron} />
            </button>

            {brandsOpen ? (
              <div className={styles.dropdownMenu}>
                <Link
                  href={buildCatalogQuery({
                    audience: selectedAudience,
                    category: selectedCategory,
                    q: searchQuery,
                  })}
                  className={`${styles.dropdownItem} ${
                    !selectedBrand ? styles.dropdownItemActive : ""
                  }`}
                >
                  Все бренды
                </Link>

                {brands.map((brand) => (
                  <Link
                    key={brand}
                    href={buildCatalogQuery({
                      audience: selectedAudience,
                      category: selectedCategory,
                      brand,
                      q: searchQuery,
                    })}
                    className={`${styles.dropdownItem} ${
                      selectedBrand === brand ? styles.dropdownItemActive : ""
                    }`}
                  >
                    {brand}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.quickFilters} aria-label="Бренды">
            {visibleBrands.map((brand) => (
              <Link
                key={brand}
                href={buildCatalogQuery({
                  audience: selectedAudience,
                  category: selectedCategory,
                  brand: selectedBrand === brand ? "" : brand,
                  q: searchQuery,
                })}
                className={`${styles.chip} ${
                  selectedBrand === brand ? styles.chipActive : ""
                }`}
              >
                {brand}
              </Link>
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

          {sortOpen ? (
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
          ) : null}
        </div>
      </div>

      <section className={styles.results}>
        <div className={styles.resultsBar}>
          <div className={styles.count}>{`${visibleProducts.length} товаров`}</div>
        </div>

        <ul className={styles.grid} aria-busy="false">
          {visibleProducts.map((product) => (
            <ProductTile
              key={product.id}
              product={{
                id: product.id,
                title: product.title,
                brand: product.brand,
                images: product.images,
                minPrice: getMinPrice(product),
              }}
            />
          ))}
        </ul>

        {visibleProducts.length === 0 ? (
        <div className={styles.empty}>Ничего не найдено</div>
        ) : null}
      </section>
    </div>
  );
}