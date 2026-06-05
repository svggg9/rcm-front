"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import styles from "./Catalog.module.css";
import { ProductTile } from "../ProductTile/ProductTile";
import { ChevronDownIcon } from "../icons/ChevronDownIcon";
import { EmptyState } from "../ui/EmptyState";

import type {
  CatalogProduct,
  SelectedAudience,
  SortValue,
} from "./catalogTypes";
import {
  audienceLabels,
  buildCatalogQuery,
  getMinPrice,
  getProductsCountText,
  sortLabels,
} from "./catalogUtils";

type Props = {
  products: CatalogProduct[];
  totalProducts: number;
  brands: string[];
  selectedCategory: string;
  selectedAudience: SelectedAudience;
  initialBrand: string;
  searchQuery: string;
  pageTitle: string;
  currentPage: number;
  totalPages: number;
  initialSort: SortValue;
  hasError: boolean;
};

export function CatalogClient({
  products,
  totalProducts,
  brands,
  selectedCategory,
  selectedAudience,
  initialBrand,
  searchQuery,
  pageTitle,
  currentPage,
  totalPages,
  initialSort,
  hasError,
}: Props) {
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [sortBy, setSortBy] = useState<SortValue>(initialSort);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const brandsDropdownRef = useRef<HTMLDivElement | null>(null);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedBrand(initialBrand);
  }, [initialBrand]);

  useEffect(() => {
    setSortBy(initialSort);
  }, [initialSort]);

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

  function getSortHref(value: Exclude<SortValue, "">) {
    return buildCatalogQuery({
      audience: selectedAudience,
      category: selectedCategory,
      brand: selectedBrand,
      q: searchQuery,
      sort: sortBy === value ? "" : value,
    });
  }

  return (
    <div className={styles.catalogPage}>
      <div className={styles.catalogTop}>
        <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
          <ol className={styles.breadcrumbList}>
            <li className={styles.breadcrumbItem}>
              <Link
                href={buildCatalogQuery({ audience: selectedAudience })}
                className={styles.breadcrumbLink}
                prefetch={false}
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
              aria-expanded={brandsOpen}
              aria-haspopup="menu"
            >
              <span>{selectedBrand || "Все"}</span>
              <ChevronDownIcon className={styles.chevron} />
            </button>

            {brandsOpen ? (
              <div className={styles.dropdownMenu} role="menu">
                <Link
                  href={buildCatalogQuery({
                    audience: selectedAudience,
                    category: selectedCategory,
                    q: searchQuery,
                    sort: sortBy,
                  })}
                  className={`${styles.dropdownItem} ${
                    !selectedBrand ? styles.dropdownItemActive : ""
                  }`}
                  onClick={() => setBrandsOpen(false)}
                  prefetch={false}
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
                      sort: sortBy,
                    })}
                    className={`${styles.dropdownItem} ${
                      selectedBrand === brand ? styles.dropdownItemActive : ""
                    }`}
                    onClick={() => setBrandsOpen(false)}
                    prefetch={false}
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
                  sort: sortBy,
                })}
                className={`${styles.chip} ${
                  selectedBrand === brand ? styles.chipActive : ""
                }`}
                prefetch={false}
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
            aria-expanded={sortOpen}
            aria-haspopup="menu"
          >
            <span className={styles.sortButtonText}>{sortButtonText}</span>
            <ChevronDownIcon className={styles.chevron} />
          </button>

          {sortOpen ? (
            <div className={styles.sortMenu} role="menu">
              {(["price-desc", "price-asc", "newest"] as const).map((value) => (
                <Link
                  key={value}
                  href={getSortHref(value)}
                  className={`${styles.dropdownItem} ${
                    sortBy === value ? styles.dropdownItemActive : ""
                  }`}
                  onClick={() => setSortOpen(false)}
                  prefetch={false}
                >
                  {sortLabels[value]}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <section className={styles.results}>
        <div className={styles.resultsBar}>
          <div className={styles.count}>{getProductsCountText(totalProducts)}</div>
        </div>

        <ul className={styles.grid} aria-busy="false">
          {products.map((product) => (
            <ProductTile
              key={product.id}
              product={{
                id: product.id,
                title: product.title,
                brand: product.brand,
                brandSlug: product.brandSlug,
                images: product.images,
                minPrice: getMinPrice(product),
              }}
            />
          ))}
        </ul>

        {products.length === 0 ? (
          <EmptyState
            title={hasError ? "Не удалось загрузить каталог" : "Ничего не найдено"}
            text={
              hasError
                ? "Обновите страницу или попробуйте позже."
                : "Попробуйте изменить бренд, категорию или поисковый запрос."
            }
          />
        ) : null}
      </section>

      {totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Пагинация">
          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;

            return (
              <Link
                key={page}
                href={buildCatalogQuery({
                  audience: selectedAudience,
                  category: selectedCategory,
                  brand: selectedBrand,
                  q: searchQuery,
                  page,
                  sort: sortBy,
                })}
                className={`${styles.pageLink} ${
                  currentPage === page ? styles.pageLinkActive : ""
                }`}
                aria-current={currentPage === page ? "page" : undefined}
                prefetch={false}
              >
                {page}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}