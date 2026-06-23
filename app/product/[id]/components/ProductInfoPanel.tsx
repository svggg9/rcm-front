"use client";

import Link from "next/link";
import styles from "../ProductPage.module.css";

import type { Product, Variant } from "../lib/types";
import Image from "next/image";
import { Price } from "../../../components/ui/Price";
import { ProductVariantSelect } from "./ProductVariantSelect";
import { ProductDetailsAccordion } from "./ProductDetailsAccordion";

type Props = {
  product: Product;
  variants: Variant[];
  selectedVariantId: number | null;
  onChangeVariant: (variantId: number) => void;
  selectedVariant: Variant | null;
  currentPrice: number;
  adding: boolean;
  isFav: boolean;
  onAddToCart: () => void;
  onToggleFavorite: () => void | Promise<void>;
  isSellerView: boolean;
  onEditProduct: () => void;
  openDescription: boolean;
  openShipping: boolean;
  onToggleDescription: () => void;
  onToggleShipping: () => void;
};

function formatDeliveryDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(value);
}

function getEstimatedDeliveryRange() {
  const start = new Date();
  const end = new Date();

  start.setDate(start.getDate() + 3);
  end.setDate(end.getDate() + 7);

  return `${formatDeliveryDate(start)} - ${formatDeliveryDate(end)}`;
}

export function ProductInfoPanel({
  product,
  variants,
  selectedVariantId,
  onChangeVariant,
  selectedVariant,
  currentPrice,
  adding,
  isFav,
  onAddToCart,
  onToggleFavorite,
  isSellerView,
  onEditProduct,
  openDescription,
  openShipping,
  onToggleDescription,
  onToggleShipping,
}: Props) {
  const deliveryRange = getEstimatedDeliveryRange();

  return (
    <aside className={styles.info}>
      <div className={styles.heading}>
        <div className={styles.brandRow}>
          {product.brandSlug ? (
            <Link href={`/brand/${product.brandSlug}`} className={styles.brand}>
              {product.brand}
            </Link>
          ) : (
            <div className={styles.brand}>{product.brand}</div>
          )}

          {!isSellerView ? (
            <button
              type="button"
              className={`${styles.favoriteIconBtn} ${isFav ? styles.favoriteIconBtnActive : ""}`}
              onClick={() => void onToggleFavorite()}
              aria-label={isFav ? "Убрать из избранного" : "Добавить в избранное"}
              aria-pressed={isFav}
            >
              <Image
                src={isFav ? "/icons/like-filled.svg" : "/icons/like.svg"}
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
              />
            </button>
          ) : null}
        </div>

        <h1 className={styles.title}>{product.title}</h1>
      </div>

      <div className={styles.priceBlock}>
        <div className={styles.price}>
          <Price amount={currentPrice} />
        </div>
      </div>

      <div className={styles.variantBlock}>
        <ProductVariantSelect
          variants={variants}
          selectedVariantId={selectedVariantId}
          onChange={onChangeVariant}
        />

        <div className={styles.actions}>
          {isSellerView ? (
            <button
              type="button"
              className={styles.addBtn}
              onClick={onEditProduct}
            >
              Редактировать
            </button>
          ) : (
            <button
              type="button"
              className={styles.addBtn}
              onClick={onAddToCart}
              disabled={
                adding ||
                !selectedVariant ||
                (selectedVariant.availableQuantity !== null &&
                  selectedVariant.availableQuantity <= 0)
              }
            >
              {adding ? "Добавляем…" : "Добавить в корзину"}
            </button>
          )}

        </div>
      </div>

      <div className={styles.deliveryEstimate}>
        <div className={styles.deliveryEstimateTitle}>Примерная дата доставки:</div>
        <div className={styles.deliveryEstimateValue}>{deliveryRange}</div>
      </div>

      <ProductDetailsAccordion
        product={product}
        selectedVariant={selectedVariant}
        openDescription={openDescription}
        openShipping={openShipping}
        onToggleDescription={onToggleDescription}
        onToggleShipping={onToggleShipping}
      />
    </aside>
  );
}
