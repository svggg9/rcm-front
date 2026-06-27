"use client";

import { useEffect, useRef, useState } from "react";

import styles from "../ProductPage.module.css";
import { Price } from "../../../components/ui/Price";

import type { Variant } from "../lib/types";

type Props = {
  variants: Variant[];
  selectedVariantId: number | null;
  onChange: (variantId: number) => void;
};

export function ProductVariantSelect({
  variants,
  selectedVariantId,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (variants.length <= 1) {
    return null;
  }

  return (
    <div className={styles.variantSelect} ref={rootRef} data-open={open}>
      <button
        type="button"
        className={`${styles.variantSelectButton} ${
          selectedVariant ? "" : styles.variantSelectPlaceholder
        }`.trim()}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{selectedVariant ? selectedVariant.size : "Выберите размер"}</span>
        <span className={styles.variantSelectChevron} aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M4 6L8 10L12 6" />
          </svg>
        </span>
      </button>

      <div className={styles.variantSelectMenu}>
        <div className={styles.variantSelectOptions}>
          {variants.map((variant) => {
            const disabled =
              variant.availableQuantity !== null && variant.availableQuantity <= 0;

            return (
              <button
                key={variant.id}
                type="button"
                className={styles.variantSelectOption}
                disabled={disabled}
                onClick={() => {
                  onChange(variant.id);
                  setOpen(false);
                }}
              >
                <span className={styles.variantSelectSize}>{variant.size}</span>
                <span className={styles.variantSelectPrice}>
                  <Price amount={variant.price} />
                  {disabled ? " нет в наличии" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
