"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "../../../components/ui/Button";
import { Price } from "../../../components/ui/Price";
import { ProductDetailsAccordion } from "./ProductDetailsAccordion";
import { ProductVariantSelect } from "./ProductVariantSelect";
import { ProductDeliveryPreview } from "./ProductDeliveryPreview";
import styles from "../ProductPage.module.css";

import type { Product, Variant } from "../lib/types";

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
  openBrand: boolean;
  onToggleDescription: () => void;
  onToggleBrand: () => void;
};


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
  openBrand,
  onToggleDescription,
  onToggleBrand,
}: Props) {
  return (
    <aside className={styles.info}>
      <div className={styles.heading}>
        <div className={styles.brandRow}>
          {product.brand.trim() ? (
            product.brandSlug ? (
              <Link href={`/brand/${product.brandSlug}`} className={styles.brand}>
                {product.brand}
              </Link>
            ) : (
              <div className={styles.brand}>{product.brand}</div>
            )
          ) : null}

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
            <Button
              type="button"
              variant="primaryShimmer"
              className={styles.addBtn}
              onClick={onEditProduct}
            >
              Редактировать
            </Button>
          ) : (
            <Button
              type="button"
              variant="primaryShimmer"
              className={styles.addBtn}
              onClick={onAddToCart}
              disabled={
                adding ||
                !selectedVariant ||
                (selectedVariant.availableQuantity !== null &&
                  selectedVariant.availableQuantity <= 0)
              }
            >
              Добавить в корзину
            </Button>
          )}
        </div>
      </div>

      <ProductDeliveryPreview productId={product.id} />

      <ProductDetailsAccordion
        product={product}
        selectedVariant={selectedVariant}
        openDescription={openDescription}
        openBrand={openBrand}
        onToggleDescription={onToggleDescription}
        onToggleBrand={onToggleBrand}
      />
    </aside>
  );
}
