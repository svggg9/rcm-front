"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { Icon } from "../ui/Icon";
import styles from "./Catalog.module.css";

export type MobileCategoryChoice = { value: string; label: string };

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
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
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
        <div className={styles.categorySheetOptions}>
          {[{ value: "", label: "Все товары" }, ...categories].map((category) => (
            <button
              key={category.value}
              type="button"
              className={styles.categorySheetOption}
              aria-pressed={category.value ? selectedCategories.includes(category.value) : selectedCategories.length === 0}
              disabled={pending}
              onClick={() => onSelect(category.value)}
            >
              <span>{category.label}</span>
              {(category.value ? selectedCategories.includes(category.value) : selectedCategories.length === 0) ? <Icon name="check" size={19} strokeWidth={1.5} /> : null}
            </button>
          ))}
        </div>
      </section>
    </div>,
    document.body
  );
}
