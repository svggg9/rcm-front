"use client";

import { Price } from "../../../components/ui/Price";
import styles from "../ProductPage.module.css";
import type { Variant } from "../lib/types";

type Props = {
  variants: Variant[];
  selectedVariantId: number | null;
  onChange: (variantId: number) => void;
};

export function ProductVariantSelect({ variants, selectedVariantId, onChange }: Props) {
  const singleVariant = variants[0];
  if (variants.length <= 1) {
    return singleVariant?.size ? (
      <div className={styles.variantSingle}>
        <span>Размер</span>
        <strong>{singleVariant.size}</strong>
      </div>
    ) : null;
  }

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  return (
    <div className={styles.sizes}>
      <div className={styles.sizeHeading}>
        <span>Размер</span>
        {selectedVariant ? <strong>{selectedVariant.size}</strong> : null}
      </div>
      <div className={styles.sizeOptions} role="group" aria-label="Размер товара">
        {variants.map((variant) => {
          const unavailable = variant.availableQuantity !== null && variant.availableQuantity <= 0;
          return (
            <button
              key={variant.id}
              type="button"
              className={styles.sizeOption}
              disabled={unavailable}
              aria-pressed={variant.id === selectedVariantId}
              aria-label={`Размер: ${variant.size || "Без размера"}${unavailable ? ", нет в наличии" : ""}`}
              onClick={() => onChange(variant.id)}
            >
              <span>{variant.size || "Без размера"}</span>
              <span className={styles.sizePrice}><Price amount={variant.price} /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
