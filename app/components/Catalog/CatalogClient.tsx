"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import styles from "./Catalog.module.css";
import { ProductTile } from "../ProductTile/ProductTile";
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
} from "./catalogUtils";

type Props = {
  products: CatalogProduct[];
  selectedCategory: string;
  selectedAudience: SelectedAudience;
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
  selectedCategory,
  selectedAudience,
  searchQuery,
  currentPage,
  totalPages,
  initialSort,
  hasError,
}: Props) {
  const [sortBy, setSortBy] = useState<SortValue>(initialSort);

  useEffect(() => {
    setSortBy(initialSort);
  }, [initialSort]);

  const breadcrumbAudienceLabel = audienceLabels[selectedAudience];
  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

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
          </ol>
        </nav>
      </div>

      <section className={styles.results}>
        <ul className={styles.grid} aria-busy="false">
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
