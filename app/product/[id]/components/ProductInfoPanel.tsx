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
  addSuccess: boolean;
  isFav: boolean;
  favoritePending: boolean;
  onAddToCart: () => void;
  onToggleFavorite: () => void | Promise<void>;
  isSellerView: boolean;
  onEditProduct: () => void;
  selectedColorwayId: number | null;
  onChangeColorway: (colorwayId: number) => void;
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
  addSuccess,
  isFav,
  favoritePending,
  onAddToCart,
  onToggleFavorite,
  isSellerView,
  onEditProduct,
  selectedColorwayId,
  onChangeColorway,
  openDescription,
  openBrand,
  onToggleDescription,
  onToggleBrand,
}: Props) {
  const colorways = product.colorways ?? [];
  const selectedColorway =
    colorways.find((colorway) => colorway.id === selectedColorwayId) ??
    colorways[0] ??
    null;
  const hasAvailableVariant = variants.some(
    (variant) =>
      variant.availableQuantity === null || variant.availableQuantity > 0
  );
  const needsVariantSelection = variants.length > 1 && !selectedVariant;
  const selectedVariantUnavailable = Boolean(
    selectedVariant &&
      selectedVariant.availableQuantity !== null &&
      selectedVariant.availableQuantity <= 0
  );
  const purchaseDisabled =
    adding ||
    addSuccess ||
    !hasAvailableVariant ||
    needsVariantSelection ||
    selectedVariantUnavailable;
  const purchaseLabel = !hasAvailableVariant
    ? "Нет в наличии"
    : needsVariantSelection
      ? "Выберите размер"
      : "Добавить в корзину";

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
              className={`${styles.favoriteIconBtn} ${
                isFav ? styles.favoriteIconBtnActive : ""
              }`}
              onClick={() => void onToggleFavorite()}
              disabled={favoritePending}
              aria-busy={favoritePending || undefined}
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
          {needsVariantSelection ? (
            <span className={styles.priceFrom}>от</span>
          ) : null}
          <Price amount={currentPrice} />
        </div>
      </div>

      <div className={styles.variantBlock}>
        {colorways.length > 1 ? (
          <div className={styles.colorways}>
            <div className={styles.colorwayHeader}>
              <span>Цвет</span>
              <strong>{selectedColorway?.color || "Не указан"}</strong>
            </div>

            <div
              className={styles.colorwayList}
              role="group"
              aria-label="Цвет товара"
            >
              {colorways.map((colorway) => {
                const preview = colorway.images?.[0];
                const active = colorway.id === selectedColorway?.id;

                return (
                  <button
                    key={colorway.id}
                    type="button"
                    className={`${styles.colorwayOption} ${
                      active ? styles.colorwayOptionActive : ""
                    }`.trim()}
                    onClick={() => onChangeColorway(colorway.id)}
                    aria-label={`Цвет: ${colorway.color || "не указан"}`}
                    aria-pressed={active}
                  >
                    {preview ? (
                      <Image
                        src={preview}
                        alt=""
                        fill
                        sizes="54px"
                        className={styles.colorwayImage}
                      />
                    ) : (
                      <span
                        className={styles.colorwaySwatch}
                        style={{
                          backgroundColor: colorway.colorHex || "#f7f7f7",
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <ProductVariantSelect
          variants={variants}
          selectedVariantId={selectedVariantId}
          onChange={onChangeVariant}
        />

        <div className={styles.actions}>
          {isSellerView ? (
            <Button
              type="button"
              variant="primary"
              className={styles.addBtn}
              onClick={onEditProduct}
            >
              Редактировать
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              className={styles.addBtn}
              onClick={onAddToCart}
              loading={adding}
              success={addSuccess}
              disabled={purchaseDisabled}
              aria-label={
                adding
                  ? "Добавляем в корзину"
                  : addSuccess
                    ? "Добавлено в корзину"
                    : purchaseLabel
              }
            >
              {purchaseLabel}
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
        isSellerView={isSellerView}
        onToggleDescription={onToggleDescription}
        onToggleBrand={onToggleBrand}
      />
    </aside>
  );
}
