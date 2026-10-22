"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "../ui/Icon";
import styles from "./Catalog.module.css";

export type MobileCategoryChoice = { value: string; label: string; depth?: number; path?: string; parentValue?: string | null };

export function CatalogCategorySheet({
  categories,
  selectedCategories,
  pending,
  onSelect,
  onClose,
}: {
  categories: MobileCategoryChoice[];
  selectedCategories: string[];
  pending: boolean;
  onSelect: (category: string) => void;
  onClose: () => void;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [parentValue, setParentValue] = useState<string | null>(() => {
    const selected = categories.find(category => selectedCategories.includes(category.value));
    if (!selected) return null;
    return categories.some(category => category.parentValue === selected.value) ? selected.value : selected.parentValue ?? null;
  });
  const currentParent = categories.find(category => category.value === parentValue);
  const selectionRef = useRef<HTMLButtonElement>(null);
  const cleanQuery = query.trim().toLocaleLowerCase("ru");
  const visibleCategories = categories.filter(category => cleanQuery ?
    (category.path ?? category.label).toLocaleLowerCase("ru").includes(cleanQuery) :
    (category.parentValue ?? null) === (currentParent?.value ?? null));

  function openLevel(value: string | null) {
    setParentValue(value);
    setQuery("");
    requestAnimationFrame(() => selectionRef.current?.focus());
  }

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== layerRef.current
    );
    const previousInert = siblings.map((element) => ({ element, inert: element.inert }));
    previousInert.forEach(({ element }) => { element.inert = true; });
    const selected = dialogRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    (selected ?? dialogRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])"));
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    const media = window.matchMedia("(max-width: 640px)");
    const handleViewport = () => { if (!media.matches) onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    media.addEventListener("change", handleViewport);
    return () => {
      document.body.style.overflow = previousOverflow;
      previousInert.forEach(({ element, inert }) => { element.inert = inert; });
      window.removeEventListener("keydown", handleKeyDown);
      media.removeEventListener("change", handleViewport);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div ref={layerRef} className={styles.drawerLayer}>
      <button
        type="button"
        tabIndex={-1}
        className={styles.drawerBackdrop}
        aria-label="Закрыть категории"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        className={styles.categorySheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-categories-title"
        tabIndex={-1}
      >
        <header className={styles.categorySheetHeader}>
          <h2 id="mobile-categories-title">Категории</h2>
          <button type="button" className={styles.drawerClose} aria-label="Закрыть категории" onClick={onClose}>
            <Icon name="x" size={22} strokeWidth={1.5} />
          </button>
        </header>
        <label className={styles.categorySheetSearch}>
          <Icon name="search" size={18} />
          <span className={styles.visuallyHidden}>Найти категорию</span>
          <input type="search" value={query} placeholder="Найти категорию" onChange={event => setQuery(event.target.value)} />
        </label>
        {currentParent ? <div className={styles.categorySheetLocation}>
          <button type="button" className={styles.categorySheetBack} disabled={pending}
            onClick={() => openLevel(currentParent.parentValue ?? null)}>
            <Icon name="chevron-left" size={18} />Назад
          </button>
          <span>{currentParent.path ?? currentParent.label}</span>
        </div> : null}
        <div className={styles.categorySheetOptions}>
          <button ref={selectionRef} type="button" className={styles.categorySheetOption}
            disabled={pending} aria-pressed={currentParent ? selectedCategories.includes(currentParent.value) : selectedCategories.length === 0}
            onClick={() => onSelect(currentParent?.value ?? "")}>
            <span>{currentParent ? `Все товары: ${currentParent.label}` : "Все товары"}</span>
            {(currentParent ? selectedCategories.includes(currentParent.value) : selectedCategories.length === 0) ? <Icon name="check" size={19} strokeWidth={1.5} /> : null}
          </button>
          {visibleCategories.map((category) => {
            const hasChildren = categories.some(child => child.parentValue === category.value);
            return (
            <button
              key={category.value}
              type="button"
              className={styles.categorySheetOption}
              aria-pressed={category.value ? selectedCategories.includes(category.value) : selectedCategories.length === 0}
              disabled={pending}
              onClick={() => hasChildren ? openLevel(category.value) : onSelect(category.value)}
            >
              <span>{cleanQuery ? category.path ?? category.label : category.label}</span>
              {hasChildren ? <Icon name="chevron-right" size={19} strokeWidth={1.5} /> : selectedCategories.includes(category.value) ? <Icon name="check" size={19} strokeWidth={1.5} /> : null}
            </button>
          ); })}
          {visibleCategories.length === 0 && query.trim() ? <p className="textMuted textSmall" role="status">Категории не найдены</p> : null}
        </div>
      </section>
    </div>,
    document.body
  );
}
