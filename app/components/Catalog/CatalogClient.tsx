"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import styles from "./Catalog.module.css";
import { CatalogFiltersDrawer } from "./CatalogFiltersDrawer";
import type {
  CatalogCategoryGroup,
  CatalogCollectionOption,
  CatalogFilterSelection,
  CatalogProduct,
  CatalogSize,
  CatalogView,
  SelectedAudience,
  SortValue,
} from "./catalogTypes";
import {
  audienceLabels,
  buildCatalogQuery,
  getMinPrice,
  sortLabels,
} from "./catalogUtils";
import { ProductTile } from "../ProductTile/ProductTile";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";

type Props = {
  products: CatalogProduct[];
  categoryGroups: CatalogCategoryGroup[];
  brands: string[];
  sizes: CatalogSize[];
  collections: CatalogCollectionOption[];
  selectedCategory: string;
  selectedAudience: SelectedAudience;
  selectedBrands: string[];
  selectedSizes: string[];
  minPrice?: number;
  maxPrice?: number;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  initialSort: SortValue;
  selectedView: CatalogView;
  selectedCollectionId?: number;
  hasError: boolean;
};

const PRIMARY_CATEGORY_NAMES = new Set(["Одежда", "Обувь", "Аксессуары"]);

function getPaginationItems(currentPage: number, totalPages: number) {
  const items: Array<number | "dots-start" | "dots-end"> = [];

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  items.push(1);
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) items.push("dots-start");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push("dots-end");
  items.push(totalPages);
  return items;
}

function productCountLabel(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  const noun =
    lastTwo >= 11 && lastTwo <= 14
      ? "товаров"
      : last === 1
        ? "товар"
        : last >= 2 && last <= 4
          ? "товара"
          : "товаров";
  return `${new Intl.NumberFormat("ru-RU").format(count)} ${noun}`;
}

function shortCategoryName(value: string): string {
  return value.split("/").map((part) => part.trim()).filter(Boolean).at(-1) ?? value;
}

function formatFilterPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function ScrollableSubcategoryNav({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: ReactNode;
}) {
  const navRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  const updateScrollState = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    const maxScrollLeft = Math.max(0, nav.scrollWidth - nav.clientWidth);
    const next = {
      left: nav.scrollLeft > 3,
      right: nav.scrollLeft < maxScrollLeft - 3,
    };

    setScrollState((current) =>
      current.left === next.left && current.right === next.right ? current : next
    );
  }, []);

  const revealActiveItem = useCallback(() => {
    const nav = navRef.current;
    const activeItem = nav?.querySelector<HTMLElement>('[data-active="true"]');
    if (!nav || !activeItem) return;

    const targetLeft = Math.max(
      0,
      activeItem.offsetLeft - (nav.clientWidth - activeItem.offsetWidth) / 2
    );
    const previousScrollBehavior = nav.style.scrollBehavior;
    nav.style.scrollBehavior = "auto";
    nav.scrollTo({ left: targetLeft });
    nav.style.scrollBehavior = previousScrollBehavior;
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const frame = window.requestAnimationFrame(() => {
      revealActiveItem();
      updateScrollState();
    });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(nav);
    nav.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      nav.removeEventListener("scroll", updateScrollState);
    };
  }, [children, revealActiveItem, updateScrollState]);

  const scroll = useCallback((direction: -1 | 1) => {
    const nav = navRef.current;
    if (!nav) return;

    nav.scrollBy({
      left: direction * Math.max(240, Math.round(nav.clientWidth * 0.72)),
      behavior: "smooth",
    });
  }, []);

  return (
    <div className={styles.subcategoryScroller}>
      <button
        type="button"
        className={`${styles.subcategoryArrow} ${styles.subcategoryArrowLeft}`}
        data-visible={scrollState.left}
        disabled={!scrollState.left}
        aria-label="Прокрутить подкатегории влево"
        onClick={() => scroll(-1)}
      >
        <Icon name="chevron-left" size={20} strokeWidth={1.35} />
      </button>

      <nav ref={navRef} className={styles.subcategories} aria-label={ariaLabel}>
        {children}
      </nav>

      <button
        type="button"
        className={`${styles.subcategoryArrow} ${styles.subcategoryArrowRight}`}
        data-visible={scrollState.right}
        disabled={!scrollState.right}
        aria-label="Прокрутить подкатегории вправо"
        onClick={() => scroll(1)}
      >
        <Icon name="chevron-right" size={20} strokeWidth={1.35} />
      </button>
    </div>
  );
}

export function CatalogClient({
  products,
  categoryGroups,
  brands,
  sizes,
  collections,
  selectedCategory,
  selectedAudience,
  selectedBrands,
  selectedSizes,
  minPrice,
  maxPrice,
  searchQuery,
  currentPage,
  totalPages,
  totalProducts,
  initialSort,
  selectedView,
  selectedCollectionId,
  hasError,
}: Props) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );
  const primaryGroups = useMemo(
    () => categoryGroups.filter((group) => PRIMARY_CATEGORY_NAMES.has(group.name)),
    [categoryGroups]
  );
  const activeCategoryGroup = useMemo(
    () =>
      categoryGroups.find(
        (group) =>
          group.name === selectedCategory ||
          group.rootCategory?.name === selectedCategory ||
          group.categories.some((category) => category.name === selectedCategory)
      ),
    [categoryGroups, selectedCategory]
  );
  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.id === selectedCollectionId),
    [collections, selectedCollectionId]
  );

  const currentFilters: CatalogFilterSelection = useMemo(
    () => ({
      category: selectedCategory,
      brands: selectedBrands,
      sizes: selectedSizes,
      minPrice,
      maxPrice,
    }),
    [maxPrice, minPrice, selectedBrands, selectedCategory, selectedSizes]
  );

  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    selectedBrands.length +
    selectedSizes.length +
    (minPrice !== undefined || maxPrice !== undefined ? 1 : 0);
  const displayedSort: SortValue =
    initialSort || (selectedView === "new" ? "newest" : "");

  const queryFor = useCallback(
    (
      overrides: Partial<CatalogFilterSelection> & {
        q?: string;
        sort?: SortValue;
        page?: number;
        view?: CatalogView;
        collectionId?: number;
      } = {}
    ) =>
      buildCatalogQuery({
        audience: selectedAudience,
        category: overrides.category ?? selectedCategory,
        brands: overrides.brands ?? selectedBrands,
        sizes: overrides.sizes ?? selectedSizes,
        minPrice: Object.prototype.hasOwnProperty.call(overrides, "minPrice")
          ? overrides.minPrice
          : minPrice,
        maxPrice: Object.prototype.hasOwnProperty.call(overrides, "maxPrice")
          ? overrides.maxPrice
          : maxPrice,
        q: Object.prototype.hasOwnProperty.call(overrides, "q")
          ? overrides.q
          : searchQuery,
        sort: overrides.sort ?? initialSort,
        page: overrides.page,
        view: Object.prototype.hasOwnProperty.call(overrides, "view")
          ? overrides.view
          : selectedView,
        collectionId: Object.prototype.hasOwnProperty.call(overrides, "collectionId")
          ? overrides.collectionId
          : selectedCollectionId,
      }),
    [
      initialSort,
      maxPrice,
      minPrice,
      searchQuery,
      selectedAudience,
      selectedBrands,
      selectedCategory,
      selectedCollectionId,
      selectedSizes,
      selectedView,
    ]
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSortOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
    window.requestAnimationFrame(() => filterButtonRef.current?.focus());
  }, []);

  function applyFilters(filters: CatalogFilterSelection) {
    closeFilters();
    startTransition(() => {
      router.push(
        buildCatalogQuery({
          audience: selectedAudience,
          category: filters.category,
          brands: filters.brands,
          sizes: filters.sizes,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          q: searchQuery,
          sort: initialSort,
          view: filters.category ? "" : selectedView,
          collectionId: filters.category ? undefined : selectedCollectionId,
        })
      );
    });
  }

  const title = searchQuery
    ? `Результаты для «${searchQuery}»`
    : selectedCategory
      ? shortCategoryName(selectedCategory)
      : selectedCollection
        ? selectedCollection.title
        : selectedView === "new"
          ? "Новинки"
          : selectedAudience === "all"
            ? "Каталог"
            : audienceLabels[selectedAudience];

  const activeChips = [
    ...(selectedCategory
      ? [
          {
            key: "category",
            label: shortCategoryName(selectedCategory),
            href: queryFor({ category: "", page: undefined }),
          },
        ]
      : []),
    ...selectedBrands.map((brand) => ({
      key: `brand-${brand}`,
      label: brand,
      href: queryFor({ brands: selectedBrands.filter((item) => item !== brand) }),
    })),
    ...selectedSizes.map((size) => ({
      key: `size-${size}`,
      label: `Размер ${size}`,
      href: queryFor({ sizes: selectedSizes.filter((item) => item !== size) }),
    })),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? [
          {
            key: "price",
            label:
              minPrice !== undefined && maxPrice !== undefined
                ? `${formatFilterPrice(minPrice)}–${formatFilterPrice(maxPrice)} ₽`
                : minPrice !== undefined
                  ? `От ${formatFilterPrice(minPrice)} ₽`
                  : `До ${formatFilterPrice(maxPrice ?? 0)} ₽`,
            href: queryFor({ minPrice: undefined, maxPrice: undefined }),
          },
        ]
      : []),
  ];

  return (
    <div className={styles.catalogPage} aria-busy={isPending}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <ol>
          <li>
            <Link href="/">Главная</Link>
          </li>
          <li>
            <Icon name="chevron-right" size={13} strokeWidth={1.35} />
            {selectedCategory || selectedCollection || selectedView || searchQuery ? (
              <Link href={buildCatalogQuery({ audience: selectedAudience })}>Каталог</Link>
            ) : (
              <span aria-current="page">Каталог</span>
            )}
          </li>
          {activeCategoryGroup && selectedCategory !== activeCategoryGroup.name ? (
            <li>
              <Icon name="chevron-right" size={13} strokeWidth={1.35} />
              <Link href={queryFor({ category: activeCategoryGroup.name, q: "" })}>
                {activeCategoryGroup.name}
              </Link>
            </li>
          ) : null}
          {selectedCategory ? (
            <li>
              <Icon name="chevron-right" size={13} strokeWidth={1.35} />
              {searchQuery ? (
                <Link href={queryFor({ q: "" })}>{shortCategoryName(selectedCategory)}</Link>
              ) : (
                <span aria-current="page">{shortCategoryName(selectedCategory)}</span>
              )}
            </li>
          ) : null}
          {selectedCollection ? (
            <li>
              <Icon name="chevron-right" size={13} strokeWidth={1.35} />
              {searchQuery ? (
                <Link href={queryFor({ q: "" })}>{selectedCollection.title}</Link>
              ) : (
                <span aria-current="page">{selectedCollection.title}</span>
              )}
            </li>
          ) : selectedView === "new" ? (
            <li>
              <Icon name="chevron-right" size={13} strokeWidth={1.35} />
              {searchQuery ? (
                <Link href={queryFor({ q: "" })}>Новинки</Link>
              ) : (
                <span aria-current="page">Новинки</span>
              )}
            </li>
          ) : null}
          {searchQuery ? (
            <li>
              <Icon name="chevron-right" size={13} strokeWidth={1.35} />
              <span aria-current="page">Поиск: {searchQuery}</span>
            </li>
          ) : null}
        </ol>
      </nav>

      <header className={styles.catalogHeader}>
        <h1 className={styles.visuallyHidden}>{title}</h1>
        <p className={styles.productCount}>{productCountLabel(totalProducts)}</p>
      </header>

      {primaryGroups.length > 0 ? (
        <nav className={styles.primaryCategories} aria-label="Основные категории">
          <Link
            href={queryFor({ category: "", view: "", collectionId: undefined, q: "" })}
            data-active={!selectedCategory}
          >
            Всё
          </Link>
          {primaryGroups.map((group) => (
            <Link
              key={group.name}
              href={queryFor({
                category: group.name,
                view: "",
                collectionId: undefined,
                q: "",
              })}
              data-active={activeCategoryGroup?.name === group.name}
            >
              {group.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {!selectedCategory ? (
        <ScrollableSubcategoryNav key="discovery" ariaLabel="Подборки каталога">
          <Link
            href={queryFor({ view: "", collectionId: undefined, q: "" })}
            data-active={!selectedView && selectedCollectionId === undefined}
          >
            Все товары
          </Link>
          <Link
            href={queryFor({
              view: "new",
              collectionId: undefined,
              q: "",
              sort: "",
            })}
            data-active={selectedView === "new"}
          >
            Новинки
          </Link>
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={queryFor({
                view: "",
                collectionId: collection.id,
                q: "",
              })}
              data-active={selectedCollectionId === collection.id}
            >
              {collection.title}
            </Link>
          ))}
        </ScrollableSubcategoryNav>
      ) : activeCategoryGroup && activeCategoryGroup.categories.length > 0 ? (
        <ScrollableSubcategoryNav
          key={activeCategoryGroup.name}
          ariaLabel={`Подкатегории ${activeCategoryGroup.name}`}
        >
          <Link
            href={queryFor({
              category: activeCategoryGroup.name,
              view: "",
              collectionId: undefined,
              q: "",
            })}
            data-active={selectedCategory === activeCategoryGroup.name}
          >
            Все
          </Link>
          {activeCategoryGroup.categories.map((category) => (
            <Link
              key={category.id}
              href={queryFor({
                category: category.name,
                view: "",
                collectionId: undefined,
                q: "",
              })}
              data-active={selectedCategory === category.name}
            >
              {category.label}
            </Link>
          ))}
        </ScrollableSubcategoryNav>
      ) : null}

      <div className={styles.catalogToolbar}>
        <button
          ref={filterButtonRef}
          type="button"
          className={styles.filtersButton}
          onClick={() => setFiltersOpen(true)}
        >
          <Icon name="sliders" size={17} strokeWidth={1.4} />
          Все фильтры
          {activeFilterCount > 0 ? <span>{activeFilterCount}</span> : null}
        </button>

        <div ref={sortRef} className={styles.sortWrap} data-open={sortOpen}>
          <button
            type="button"
            className={styles.sortButton}
            aria-haspopup="menu"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen((current) => !current)}
          >
            <span>Сортировка: {displayedSort ? sortLabels[displayedSort] : "Рекомендовано"}</span>
            <Icon name="chevron-down" size={16} strokeWidth={1.4} />
          </button>
          {sortOpen ? (
            <div className={styles.sortMenu} role="menu">
              {(
                [
                  ["", "Рекомендовано"],
                  ["newest", sortLabels.newest],
                  ["price-asc", sortLabels["price-asc"]],
                  ["price-desc", sortLabels["price-desc"]],
                ] as Array<[SortValue, string]>
              ).map(([value, label]) => (
                <Link
                  key={value || "recommended"}
                  href={queryFor({
                    sort: value,
                    view:
                      selectedView === "new" && value !== "newest"
                        ? ""
                        : selectedView,
                  })}
                  role="menuitem"
                  data-active={displayedSort === value}
                  onClick={() => setSortOpen(false)}
                >
                  {label}
                  {displayedSort === value ? <Icon name="check" size={14} strokeWidth={1.7} /> : null}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className={styles.activeFilters} aria-label="Применённые фильтры">
          {activeChips.map((chip) => (
            <Link key={chip.key} href={chip.href} className={styles.activeFilterChip}>
              {chip.label}
              <Icon name="x" size={14} strokeWidth={1.4} />
            </Link>
          ))}
          <Link
            href={buildCatalogQuery({
              audience: selectedAudience,
              q: searchQuery,
              sort: initialSort,
              view: selectedView,
              collectionId: selectedCollectionId,
            })}
            className={styles.clearFilters}
          >
            Очистить всё
          </Link>
        </div>
      ) : null}

      <section className={styles.results}>
        <ul className={styles.grid}>
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
                ? "Перезапустите backend после обновления фильтров или попробуйте позже."
                : "Попробуйте изменить категорию, бренд, размер или диапазон цены."
            }
          />
        ) : null}
      </section>

      {totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Пагинация">
          {paginationItems.map((item) =>
            typeof item !== "number" ? (
              <span key={item} className={styles.pageEllipsis}>
                …
              </span>
            ) : (
              <Link
                key={item}
                href={queryFor({ page: item })}
                className={styles.pageLink}
                data-active={currentPage === item}
                aria-current={currentPage === item ? "page" : undefined}
                prefetch={false}
              >
                {item}
              </Link>
            )
          )}
        </nav>
      ) : null}

      {filtersOpen ? (
        <CatalogFiltersDrawer
          open
          categoryGroups={categoryGroups}
          brands={brands}
          sizes={sizes}
          initialFilters={currentFilters}
          pending={isPending}
          onApply={applyFilters}
          onClose={closeFilters}
        />
      ) : null}
    </div>
  );
}
