"use client";

import Link from "next/link";
import styles from "../ProductPage.module.css";
import { ProductDescriptionText } from "./ProductDescriptionText";

import type { Product, Variant } from "../lib/types";

type Props = {
  product: Product;
  selectedVariant: Variant | null;
  openDescription: boolean;
  openBrand: boolean;
  onToggleDescription: () => void;
  onToggleBrand: () => void;
};

function ChevronIcon() {
  return (
    <span className={styles.accIcon} aria-hidden="true">
      <svg viewBox="0 0 16 16" focusable="false">
        <path d="M4 6L8 10L12 6" />
      </svg>
    </span>
  );
}

export function ProductDetailsAccordion({
  product,
  selectedVariant,
  openDescription,
  openBrand,
  onToggleDescription,
  onToggleBrand,
}: Props) {
  const composition = product.composition?.trim();
  const brandDescription = product.brandDescription?.trim();

  return (
    <div className={styles.accordion}>
      <section className={styles.accItem}>
        <button
          type="button"
          className={styles.accBtn}
          onClick={onToggleDescription}
          aria-expanded={openDescription}
        >
          <span>Описание</span>
          <ChevronIcon />
        </button>

        {openDescription ? (
          <div className={styles.accBodyOpen}>
            <div className={styles.descriptionMain}>
              <div className={styles.detailGroup}>
                <ProductDescriptionText
                  text={product.description || ""}
                  fallback="???????? ???? ?? ?????????."
                />
              </div>

              {composition ? (
                <div className={styles.detailGroup}>
                  <p className={styles.text}>{composition}</p>
                </div>
              ) : null}

              <div className={styles.articleRows}>
                <div>
                  <span>Артикул сайта</span>
                  <strong>{selectedVariant?.sku || `RCM-${product.id}`}</strong>
                </div>

                {selectedVariant?.sellerArticle ? (
                  <div>
                    <span>Артикул продавца</span>
                    <strong>{selectedVariant.sellerArticle}</strong>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {brandDescription ? (
        <section className={styles.accItem}>
          <button
            type="button"
            className={styles.accBtn}
            onClick={onToggleBrand}
            aria-expanded={openBrand}
          >
            <span>О бренде</span>
            <ChevronIcon />
          </button>

          {openBrand ? (
            <div className={styles.accBody}>
              <div className={styles.brandAboutText}>
                <ProductDescriptionText text={brandDescription} fallback="" />
                {product.brandSlug ? (
                  <Link href={`/brand/${product.brandSlug}`}>
                    Все товары бренда
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
