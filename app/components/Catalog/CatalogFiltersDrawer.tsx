"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./Catalog.module.css";
import type {
  CatalogCategoryGroup,
  CatalogFilterSelection,
  CatalogSize,
} from "./catalogTypes";
import { Icon } from "../ui/Icon";

type Props = {
  open: boolean;
  categoryGroups: CatalogCategoryGroup[];
  brands: string[];
  sizes: CatalogSize[];
  initialFilters: CatalogFilterSelection;
  pending: boolean;
  onApply: (filters: CatalogFilterSelection) => void;
  onClose: () => void;
};

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function selectedGroupName(
  category: string,
  groups: CatalogCategoryGroup[]
): string | undefined {
  return groups.find(
    (group) =>
      group.name === category ||
      group.rootCategory?.name === category ||
      group.categories.some((item) => item.name === category)
  )?.name;
}

function CategoryCheckbox({ selected }: { selected: boolean }) {
  return (
    <span className={styles.checkboxMark} data-selected={selected} aria-hidden="true">
      {selected ? <Icon name="check" size={12} strokeWidth={2} /> : null}
    </span>
  );
}

export function CatalogFiltersDrawer({
  open,
  categoryGroups,
  brands,
  sizes,
  initialFilters,
  pending,
  onApply,
  onClose,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [category, setCategory] = useState(initialFilters.category);
  const [selectedBrands, setSelectedBrands] = useState(initialFilters.brands);
  const [selectedSizes, setSelectedSizes] = useState(initialFilters.sizes);
  const [minPrice, setMinPrice] = useState(
    initialFilters.minPrice === undefined ? "" : String(initialFilters.minPrice)
  );
  const [maxPrice, setMaxPrice] = useState(
    initialFilters.maxPrice === undefined ? "" : String(initialFilters.maxPrice)
  );
  const [brandSearch, setBrandSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const activeGroup = selectedGroupName(initialFilters.category, categoryGroups);
    return activeGroup
      ? [activeGroup]
      : categoryGroups.slice(0, 1).map((group) => group.name);
  });

  const toggleCategoryGroup = (groupName: string) => {
    setExpandedGroups((current) =>
      current.includes(groupName)
        ? current.filter((name) => name !== groupName)
        : [...current, groupName]
    );
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const inertedElements: Array<{
      element: HTMLElement;
      inert: boolean;
      ariaHidden: string | null;
    }> = [];
    let activeLayer: HTMLElement | null = layerRef.current;

    while (activeLayer?.parentElement) {
      const parent = activeLayer.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (sibling === activeLayer || !(sibling instanceof HTMLElement)) continue;
        inertedElements.push({
          element: sibling,
          inert: sibling.inert,
          ariaHidden: sibling.getAttribute("aria-hidden"),
        });
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
      }
      activeLayer = parent;
      if (parent === document.body) break;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || !dialogRef.current.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      for (const item of inertedElements) {
        item.element.inert = item.inert;
        if (item.ariaHidden === null) item.element.removeAttribute("aria-hidden");
        else item.element.setAttribute("aria-hidden", item.ariaHidden);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const visibleBrands = useMemo(() => {
    const query = brandSearch.trim().toLocaleLowerCase("ru");
    if (!query) return brands;
    return brands.filter((brand) => brand.toLocaleLowerCase("ru").includes(query));
  }, [brandSearch, brands]);

  const parsedMinPrice = minPrice === "" ? undefined : Number(minPrice);
  const parsedMaxPrice = maxPrice === "" ? undefined : Number(maxPrice);
  const priceInvalid =
    parsedMinPrice !== undefined &&
    parsedMaxPrice !== undefined &&
    parsedMinPrice > parsedMaxPrice;

  if (!open) return null;

  function resetDraft() {
    setCategory("");
    setSelectedBrands([]);
    setSelectedSizes([]);
    setMinPrice("");
    setMaxPrice("");
    setBrandSearch("");
  }

  function applyDraft() {
    if (priceInvalid) return;
    onApply({
      category,
      brands: selectedBrands,
      sizes: selectedSizes,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
    });
  }

  return (
    <div ref={layerRef} className={styles.drawerLayer}>
      <button
        type="button"
        className={styles.drawerBackdrop}
        aria-label="Закрыть фильтры"
        onClick={onClose}
      />

      <aside
        ref={dialogRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-filters-title"
      >
        <header className={styles.drawerHeader}>
          <div>
            <span className={styles.drawerEyebrow}>Каталог</span>
            <h2 id="catalog-filters-title">Все фильтры</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.drawerClose}
            aria-label="Закрыть фильтры"
            onClick={onClose}
          >
            <Icon name="x" size={23} strokeWidth={1.4} />
          </button>
        </header>

        <div className={styles.drawerContent}>
          <section className={styles.filterSection}>
            <h3>Категории</h3>
            <button
              type="button"
              className={styles.categoryOption}
              data-selected={category === ""}
              onClick={() => setCategory("")}
            >
              Все категории
            </button>

            <div className={styles.categoryTree}>
              {categoryGroups.map((group) => {
                const hasChildren = group.categories.length > 0;
                const expanded = expandedGroups.includes(group.name);
                const groupSelected = category === group.name;

                if (!hasChildren) {
                  const value = group.rootCategory?.name ?? group.name;
                  return (
                    <button
                      key={group.name}
                      type="button"
                      className={styles.categoryOption}
                      data-selected={category === value}
                      onClick={() => setCategory(value)}
                    >
                      {group.name}
                    </button>
                  );
                }

                return (
                  <div key={group.name} className={styles.categoryBranch}>
                    <div className={styles.categoryParentRow} data-selected={groupSelected}>
                      <button
                        type="button"
                        className={styles.categoryParentChoice}
                        aria-expanded={expanded}
                        onClick={() => {
                          setCategory(group.name);
                          toggleCategoryGroup(group.name);
                        }}
                      >
                        {group.name}
                      </button>
                      <button
                        type="button"
                        className={styles.categoryExpand}
                        aria-label={`${expanded ? "Свернуть" : "Развернуть"} ${group.name}`}
                        aria-expanded={expanded}
                        onClick={() => toggleCategoryGroup(group.name)}
                      >
                        <Icon
                          name="chevron-down"
                          size={18}
                          strokeWidth={1.4}
                          className={expanded ? styles.chevronExpanded : undefined}
                        />
                      </button>
                    </div>

                    {expanded ? (
                      <div className={styles.categoryChildren}>
                        {group.categories.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={styles.categoryOption}
                            data-selected={category === item.name}
                            onClick={() => setCategory(item.name)}
                          >
                            <CategoryCheckbox selected={category === item.name} />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.filterSection}>
            <h3>Бренд</h3>
            <label className={styles.brandSearch}>
              <Icon name="search" size={17} strokeWidth={1.5} />
              <span className={styles.visuallyHidden}>Найти бренд</span>
              <input
                type="search"
                value={brandSearch}
                placeholder="Найти бренд"
                onChange={(event) => setBrandSearch(event.target.value)}
              />
            </label>
            <div className={styles.checkboxList}>
              {visibleBrands.map((brand) => {
                const checked = selectedBrands.includes(brand);
                return (
                  <label key={brand} className={styles.checkboxRow} data-selected={checked}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedBrands((current) => toggleValue(current, brand))}
                    />
                    <span className={styles.checkboxMark} data-selected={checked}>
                      {checked ? <Icon name="check" size={12} strokeWidth={2} /> : null}
                    </span>
                    <span>{brand}</span>
                  </label>
                );
              })}
              {visibleBrands.length === 0 ? (
                <p className={styles.filterEmpty}>Бренды не найдены</p>
              ) : null}
            </div>
          </section>

          <section className={styles.filterSection}>
            <h3>Размер</h3>
            <div className={styles.sizeGrid}>
              {sizes.map((size) => {
                const selected = selectedSizes.includes(size.name);
                return (
                  <button
                    key={size.id}
                    type="button"
                    className={styles.sizeOption}
                    data-selected={selected}
                    aria-pressed={selected}
                    onClick={() =>
                      setSelectedSizes((current) => toggleValue(current, size.name))
                    }
                  >
                    {size.name}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.filterSection}>
            <h3>Цена, ₽</h3>
            <div className={styles.priceFields}>
              <label>
                <span>От</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={minPrice}
                  placeholder="0"
                  onChange={(event) => setMinPrice(event.target.value)}
                />
              </label>
              <span aria-hidden="true">—</span>
              <label>
                <span>До</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={maxPrice}
                  placeholder="Без ограничений"
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </label>
            </div>
            {priceInvalid ? (
              <p className={styles.priceError}>Цена «от» не может быть выше цены «до».</p>
            ) : null}
          </section>
        </div>

        <footer className={styles.drawerFooter}>
          <button type="button" className={styles.resetButton} onClick={resetDraft}>
            Очистить
          </button>
          <button
            type="button"
            className={styles.applyButton}
            disabled={priceInvalid || pending}
            onClick={applyDraft}
          >
            {pending ? "Применяем…" : "Применить фильтры"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
