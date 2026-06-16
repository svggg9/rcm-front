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
  currentPage: number;
  totalPages: number;
  initialSort: SortValue;
  hasError: boolean;
};

function getPaginationItems(currentPage: number, totalPages: number) {
  const items: Array<number | "dots-start" | "dots-end"> = [];

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  items.push(1);

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("dots-start");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("dots-end");
  }

  items.push(totalPages);

  return items;
}

export function CatalogClient({
  products,
  totalProducts,
  brands,
  selectedCategory,
  selectedAudience,
  initialBrand,
  searchQuery,
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

  const visibleBrands = useMemo(() => {
    const firstBrands = brands.slice(0, 8);

    if (!selectedBrand || firstBrands.includes(selectedBrand)) {
      return firstBrands;
    }

    return [selectedBrand, ...firstBrands.slice(0, 7)];
  }, [brands, selectedBrand]);
  const breadcrumbAudienceLabel = audienceLabels[selectedAudience];
  const sortButtonText = sortBy ? sortLabels[sortBy] : "Сортировка";
  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

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
          {paginationItems.map((item) => {
            if (typeof item !== "number") {
              return (
                <span key={item} className={styles.pageEllipsis}>
                  ...
                </span>
              );
            }

            return (
              <Link
                key={item}
                href={buildCatalogQuery({
                  audience: selectedAudience,
                  category: selectedCategory,
                  brand: selectedBrand,
                  q: searchQuery,
                  page: item,
                  sort: sortBy,
                })}
                className={`${styles.pageLink} ${
                  currentPage === item ? styles.pageLinkActive : ""
                }`}
                aria-current={currentPage === item ? "page" : undefined}
                prefetch={false}
              >
                {item}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
