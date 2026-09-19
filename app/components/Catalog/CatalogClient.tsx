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
import { CatalogCategorySheet } from "./CatalogCategorySheet";
import { CatalogFiltersDrawer } from "./CatalogFiltersDrawer";
import { CatalogResults } from "./CatalogResults";
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
  categoryGroupSelected,
  expandCategorySelections,
  getMobileCategoryChoices,
  sortLabels,
  toggleCategorySelection,
} from "./catalogUtils";
import { Icon } from "../ui/Icon";

type Props = {
  products: CatalogProduct[];
  categoryGroups: CatalogCategoryGroup[];
  mobileAvailableCategories: string[] | null;
  brands: string[];
  sizes: CatalogSize[];
  collections: CatalogCollectionOption[];
  selectedCategories: string[];
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
    if (nav?.contains(document.activeElement)) return;
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
  mobileAvailableCategories,
  brands,
  sizes,
  collections,
  selectedCategories,
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
  const selectedCategory = selectedCategories.length === 1 ? selectedCategories[0] : "";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );
  const activeCategoryGroup = useMemo(
    () =>
      categoryGroups.find((group) => categoryGroupSelected(selectedCategories, group)),
    [categoryGroups, selectedCategories]
  );
  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.id === selectedCollectionId),
    [collections, selectedCollectionId]
  );
  const mobileCategories = useMemo(
    () => getMobileCategoryChoices(categoryGroups, mobileAvailableCategories, selectedCategories),
    [categoryGroups, mobileAvailableCategories, selectedCategories]
  );

  const currentFilters: CatalogFilterSelection = useMemo(
    () => ({
      categories: selectedCategories,
      brands: selectedBrands,
      sizes: selectedSizes,
      minPrice,
      maxPrice,
      audience: selectedAudience,
      sort: initialSort || (selectedView === "new" ? "newest" : ""),
    }),
    [initialSort, maxPrice, minPrice, selectedAudience, selectedBrands, selectedCategories, selectedSizes, selectedView]
  );

  const activeFilterCount =
    selectedBrands.length +
    selectedSizes.length +
    (minPrice !== undefined || maxPrice !== undefined ? 1 : 0);
  const displayedSort: SortValue =
    initialSort || (selectedView === "new" ? "newest" : "");
  const mobileFilterCount = activeFilterCount +
    (selectedAudience !== "all" ? 1 : 0) + (displayedSort ? 1 : 0);

  const queryFor = useCallback(
    (
      overrides: Partial<CatalogFilterSelection> & {
        category?: string;
        q?: string;
        sort?: SortValue;
        page?: number;
        view?: CatalogView;
        collectionId?: number;
      } = {}
    ) =>
      buildCatalogQuery({
        audience: selectedAudience,
        categories: overrides.category !== undefined
          ? (overrides.category ? [overrides.category] : [])
          : overrides.categories ?? selectedCategories,
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
      selectedCategories,
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
  const closeCategories = useCallback(() => setCategoriesOpen(false), []);

  function toggleCategory(category: string) {
    const categories = category
      ? toggleCategorySelection(selectedCategories, category, categoryGroups)
      : [];
    startTransition(() => {
      router.push(queryFor({ categories, view: "", collectionId: undefined }), { scroll: false });
    });
  }

  function applyFilters(filters: CatalogFilterSelection) {
    closeFilters();
    startTransition(() => {
      router.push(
        buildCatalogQuery({
          audience: filters.audience ?? selectedAudience,
          categories: filters.categories,
          brands: filters.brands,
          sizes: filters.sizes,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          q: searchQuery,
          sort: filters.sort ?? initialSort,
          view: filters.categories.length > 0 || (selectedView === "new" && filters.sort !== "newest") ? "" : selectedView,
          collectionId: filters.categories.length > 0 ? undefined : selectedCollectionId,
        })
      );
    });
  }

  const title = searchQuery
    ? `Результаты для «${searchQuery}»`
    : selectedCategories.length > 0
      ? selectedCategories.map(shortCategoryName).join(", ")
      : selectedCollection
        ? selectedCollection.title
        : selectedView === "new"
          ? "Новинки"
          : selectedAudience === "all"
            ? "Каталог"
            : audienceLabels[selectedAudience];

  const activeChips = [
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
      <h1 className={styles.visuallyHidden}>{title}</h1>

      {categoryGroups.length > 0 ? (
        <nav className={styles.primaryCategories} aria-label="Основные категории">
          {categoryGroups.map((group) => (
            <span
              key={group.name}
              className={styles.categoryChip}
              data-active={categoryGroupSelected(selectedCategories, group)}
            >
              <button
                type="button"
                className={styles.categoryChoice}
                aria-pressed={categoryGroupSelected(selectedCategories, group)}
                disabled={isPending}
                onClick={() => toggleCategory(group.name)}
              >
                {group.name}
              </button>
              {categoryGroupSelected(selectedCategories, group) ? (
                <button
                  type="button"
                  className={styles.categoryClear}
                  aria-label={`Сбросить категорию «${group.name}»`}
                  disabled={isPending}
                  onClick={() => toggleCategory("")}
                >
                  <Icon name="x" size={18} strokeWidth={1.5} />
                </button>
              ) : null}
            </span>
          ))}
        </nav>
      ) : null}

      {selectedCategories.length === 0 ? (
        <ScrollableSubcategoryNav key="discovery" ariaLabel="Подборки каталога">
          {selectedView || selectedCollectionId !== undefined ? (
            <Link href={queryFor({ view: "", collectionId: undefined, q: "" })}>
              Все товары
            </Link>
          ) : null}
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
          {activeCategoryGroup.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              data-active={selectedCategories.includes(category.name)}
              aria-pressed={selectedCategories.includes(category.name)}
              disabled={isPending}
              onClick={() => toggleCategory(category.name)}
            >
              {category.label}
            </button>
          ))}
        </ScrollableSubcategoryNav>
      ) : null}

      <div className={styles.catalogToolbar}>
        {mobileCategories.length > 1 ? (
          <button
            type="button"
            className={styles.mobileCategoryButton}
            aria-haspopup="dialog"
            aria-expanded={categoriesOpen}
            onClick={() => setCategoriesOpen(true)}
          >
            <span>{selectedCategories.length > 1 ? `Категории: ${selectedCategories.length}` : selectedCategory ? shortCategoryName(selectedCategory) : selectedCollection?.title || (selectedView === "new" ? "Новинки" : "Все товары")}</span>
            <Icon name="chevron-down" size={17} strokeWidth={1.5} />
          </button>
        ) : (
          <span className={styles.mobileCatalogContext}>
            {selectedCategories.length > 1 ? `Категории: ${selectedCategories.length}` : selectedCategory ? shortCategoryName(selectedCategory) : selectedCollection?.title || (selectedView === "new" ? "Новинки" : "Все товары")}
          </span>
        )}
        <button
          ref={filterButtonRef}
          type="button"
          className={styles.filtersButton}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          <Icon name="sliders" size={17} strokeWidth={1.4} />
          <span className={styles.desktopFilterLabel}>Все фильтры</span>
          <span className={styles.mobileFilterLabel}>Фильтры</span>
          {activeFilterCount > 0 ? <span className={`${styles.filterCount} ${styles.desktopFilterLabel}`}>{activeFilterCount}</span> : null}
          {mobileFilterCount > 0 ? <span className={`${styles.filterCount} ${styles.mobileFilterLabel}`}>{mobileFilterCount}</span> : null}
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
            href={queryFor({ brands: [], sizes: [], minPrice: undefined, maxPrice: undefined })}
            className={styles.clearFilters}
          >
            Очистить всё
          </Link>
        </div>
      ) : null}

      <CatalogResults
        key={`${queryFor({ page: currentPage })}|${totalProducts}|${products.map((product) => product.id).join(",")}`}
        products={products}
        query={{
          audience: selectedAudience,
          categories: expandCategorySelections(selectedCategories, categoryGroups),
          brands: selectedBrands,
          sizes: selectedSizes,
          minPrice,
          maxPrice,
          q: searchQuery,
          sort: displayedSort,
          page: currentPage,
          collectionId: selectedCollectionId,
        }}
        totalPages={totalPages}
        totalProducts={totalProducts}
        hasError={hasError}
        firstPageHref={queryFor({ page: 1 })}
      />

      <p className={styles.productCount}>{productCountLabel(totalProducts)}</p>

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
          key={queryFor({ page: currentPage })}
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
      {categoriesOpen ? (
        <CatalogCategorySheet
          categories={mobileCategories}
          selectedCategories={selectedCategories}
          pending={isPending}
          onSelect={toggleCategory}
          onClose={closeCategories}
        />
      ) : null}
    </div>
  );
}
