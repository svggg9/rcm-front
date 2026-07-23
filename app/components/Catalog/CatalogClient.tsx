"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import styles from "./Catalog.module.css";
import { API_URL, apiFetch } from "../../lib/api";
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

type Category = {
  id: number;
  name: string;
  isActive?: boolean | null;
  status?: string | null;
  label?: string;
};

type CategoryGroup = {
  name: string;
  categories: Category[];
};

const CATEGORY_GROUPS = [
  {
    name: "Одежда",
    keywords: [
      "футбол",
      "майк",
      "топ",
      "лонгслив",
      "свит",
      "худи",
      "толстов",
      "рубаш",
      "блуз",
      "плать",
      "юбк",
      "брюк",
      "джинс",
      "шорт",
      "костюм",
      "пиджак",
      "жакет",
      "куртк",
      "пальто",
      "жилет",
      "бель",
      "купаль",
      "одежд",
    ],
  },
  {
    name: "Обувь",
    keywords: [
      "кроссов",
      "кед",
      "ботин",
      "сапог",
      "туфл",
      "лофер",
      "сандал",
      "босонож",
      "тапоч",
      "обув",
    ],
  },
  {
    name: "Аксессуары",
    keywords: [
      "сумк",
      "рюкзак",
      "кошел",
      "ремн",
      "головн",
      "шапк",
      "панам",
      "кепк",
      "шарф",
      "перчат",
      "очк",
      "украшен",
      "аксессуар",
    ],
  },
] as const;

function groupCategories(categories: Category[]): CategoryGroup[] {
  const assigned = new Set<number>();
  const explicitChildren = categories.map((category) => {
    const [parent, ...nameParts] = category.name.split("/").map((part) => part.trim());
    return {
      category,
      parent: nameParts.length > 0 ? parent : null,
      label: nameParts.join(" / "),
    };
  });

  const groups = CATEGORY_GROUPS.map((group) => {
    const children = categories.filter((category) => {
      const explicit = explicitChildren.find(
        (item) => item.category.id === category.id
      );
      const normalized = category.name.trim().toLocaleLowerCase("ru");
      const matches =
        normalized !== group.name.toLocaleLowerCase("ru") &&
        (explicit?.parent?.toLocaleLowerCase("ru") ===
          group.name.toLocaleLowerCase("ru") ||
          (!explicit?.parent &&
            group.keywords.some((keyword) => normalized.includes(keyword))));

      if (matches) assigned.add(category.id);
      return matches;
    }).map((category) => {
      const explicit = explicitChildren.find(
        (item) => item.category.id === category.id
      );
      return { ...category, label: explicit?.label || category.name };
    });

    return { name: group.name, categories: children };
  }).filter(
    (group) =>
      group.categories.length > 0 ||
      categories.some(
        (category) =>
          category.name.toLocaleLowerCase("ru") ===
          group.name.toLocaleLowerCase("ru")
      )
  );

  const knownGroupNames = new Set(
    groups.map((group) => group.name.toLocaleLowerCase("ru"))
  );
  const customGroups = Array.from(
    new Set(
      explicitChildren
        .map((item) => item.parent)
        .filter(
          (parent): parent is string =>
            Boolean(parent) &&
            !knownGroupNames.has(parent!.toLocaleLowerCase("ru"))
        )
    )
  ).map((parent) => ({
    name: parent,
    categories: explicitChildren
      .filter((item) => item.parent === parent)
      .map((item) => {
        assigned.add(item.category.id);
        return { ...item.category, label: item.label };
      }),
  }));

  const groupedRootNames = new Set(
    [...groups, ...customGroups].map((group) =>
      group.name.toLocaleLowerCase("ru")
    )
  );
  const standalone = categories
    .filter(
      (category) =>
        !assigned.has(category.id) &&
        !groupedRootNames.has(category.name.toLocaleLowerCase("ru"))
    )
    .map((category) => ({ name: category.name, categories: [] }));

  return [...groups, ...customGroups, ...standalone];
}

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    setSortBy(initialSort);
  }, [initialSort]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await apiFetch(`${API_URL}/api/categories`);
        if (!response.ok) return;

        const data: unknown = await response.json();
        if (!cancelled && Array.isArray(data)) {
          setCategories(
            data.filter(
              (item): item is Category =>
                typeof item === "object" &&
                item !== null &&
                typeof (item as Category).id === "number" &&
                typeof (item as Category).name === "string" &&
                (item as Category).isActive !== false &&
                (item as Category).status !== "DISABLED"
            )
          );
        }
      } catch {
        // Каталог остается доступным, если справочник категорий не загрузился.
      }
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryGroups = useMemo(
    () => groupCategories(categories),
    [categories]
  );

  useEffect(() => {
    if (!selectedCategory || categoryGroups.length === 0) return;

    const selectedGroup = categoryGroups.find(
      (group) =>
        group.name === selectedCategory ||
        group.categories.some((category) => category.name === selectedCategory)
    );
    setExpandedGroup(selectedGroup?.name ?? null);
  }, [categoryGroups, selectedCategory]);

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

        {categoryGroups.length > 0 ? (
          <nav className={styles.categoryFilter} aria-label="Категории товаров">
            <div className={styles.categoryChips}>
              {categoryGroups.map((group) => {
                const isExpanded = expandedGroup === group.name;

                return (
                  <div key={group.name} className={styles.categoryGroup}>
                    {group.categories.length > 0 ? (
                      isExpanded ? (
                        <Link
                          href={buildCatalogQuery({
                            audience: selectedAudience,
                            q: searchQuery,
                            sort: sortBy,
                          })}
                          className={`${styles.categoryChip} ${styles.categoryChipActive}`}
                          aria-expanded="true"
                          onClick={() => setExpandedGroup(null)}
                          prefetch={false}
                        >
                          {group.name}
                        </Link>
                      ) : (
                        <Link
                          href={buildCatalogQuery({
                            audience: selectedAudience,
                            q: searchQuery,
                            sort: sortBy,
                          })}
                          className={styles.categoryChip}
                          aria-expanded="false"
                          onClick={() => setExpandedGroup(group.name)}
                          prefetch={false}
                        >
                          {group.name}
                        </Link>
                      )
                    ) : (
                    <Link
                      href={buildCatalogQuery({
                        audience: selectedAudience,
                        category:
                          selectedCategory === group.name ? "" : group.name,
                        q: searchQuery,
                        sort: sortBy,
                      })}
                      className={`${styles.categoryChip} ${
                        selectedCategory === group.name
                          ? styles.categoryChipActive
                          : ""
                      }`}
                      prefetch={false}
                    >
                      {group.name}
                    </Link>
                    )}

                    {isExpanded ? (
                      <>
                        {group.categories.map((category) => (
                      <Link
                        key={category.id}
                        href={buildCatalogQuery({
                          audience: selectedAudience,
                          category:
                            selectedCategory === category.name
                              ? ""
                              : category.name,
                          q: searchQuery,
                          sort: sortBy,
                        })}
                        className={`${styles.categoryChip} ${styles.subcategoryChip} ${
                          selectedCategory === category.name
                            ? styles.categoryChipActive
                            : ""
                        }`}
                        prefetch={false}
                      >
                        {category.label ?? category.name}
                      </Link>
                        ))}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </nav>
        ) : null}
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
            icon={hasError ? "alert" : "search"}
            tone={hasError ? "danger" : "default"}
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
