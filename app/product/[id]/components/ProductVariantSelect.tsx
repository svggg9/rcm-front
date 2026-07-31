"use client";

import { useEffect, useRef, useState } from "react";

import styles from "../ProductPage.module.css";
import { Price } from "../../../components/ui/Price";
import { Icon } from "../../../components/ui/Icon";

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
  const singleVariant = variants[0] ?? null;

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
    return singleVariant?.size ? (
      <div className={styles.variantSingle}>
        <span>Размер</span>
        <strong>{singleVariant.size}</strong>
      </div>
    ) : null;
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
        aria-haspopup="listbox"
      >
        <span>{selectedVariant ? selectedVariant.size : "Выберите размер"}</span>
        <span className={styles.variantSelectChevron} aria-hidden="true">
          <Icon name="chevron-down" size={17} strokeWidth={1.35} />
        </span>
      </button>

      <div className={styles.variantSelectMenu} aria-hidden={!open}>
        <div className={styles.variantSelectOptions} role="listbox" aria-label="Размер">
          {variants.map((variant) => {
            const disabled =
              variant.availableQuantity !== null && variant.availableQuantity <= 0;

            return (
              <button
                key={variant.id}
                type="button"
                className={styles.variantSelectOption}
                disabled={disabled}
                role="option"
                aria-selected={variant.id === selectedVariantId}
                tabIndex={open ? 0 : -1}
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
