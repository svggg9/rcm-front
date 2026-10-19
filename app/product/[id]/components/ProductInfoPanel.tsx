"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../../../components/ui/Button";
import { LikeButton } from "../../../components/ui/LikeButton";
import { ProductDescriptionText } from "./ProductDescriptionText";
import { ProductArticleButton } from "./ProductArticleButton";
import { ProductShareButton } from "./ProductShareButton";
import { ProductDetailsAccordion } from "./ProductDetailsAccordion";
import { ProductVariantSelect } from "./ProductVariantSelect";
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
  onAddToCart: (variantId?: number) => void;
  onToggleFavorite: () => void | Promise<void>;
  isSellerView: boolean;
  onEditProduct: () => void;
  selectedColorwayId: number | null;
  onChangeColorway: (colorwayId: number) => void;
  openComposition: boolean;
  openBrand: boolean;
  onToggleComposition: () => void;
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
  openComposition,
  openBrand,
  onToggleComposition,
  onToggleBrand,
}: Props) {
  const pathname = usePathname();
  const variantsRef = useRef<HTMLDivElement>(null);
  const colorways = product.colorways ?? [];
  const selectedColorway =
    colorways.find((colorway) => colorway.id === selectedColorwayId) ??
    colorways[0] ??
    null;
  const prices = variants.map((variant) => variant.price);
  const minPrice = prices.length ? Math.min(...prices) : currentPrice;
  const maxPrice = prices.length ? Math.max(...prices) : currentPrice;
  const priceLabel = !selectedVariant && minPrice !== maxPrice
    ? `${minPrice.toLocaleString("ru-RU")}–${maxPrice.toLocaleString("ru-RU")}`
    : currentPrice.toLocaleString("ru-RU");

  return (
    <aside className={styles.info}>
      <div className={styles.heading}>
        <div className={styles.brandRow}>
          {product.brand.trim() ? (
            product.brandSlug ? (
              <Link href={`/brand/${product.brandSlug}?returnTo=${encodeURIComponent(pathname)}`} className={styles.brand}>
                {product.brand}
              </Link>
            ) : (
              <div className={styles.brand}>{product.brand}</div>
            )
          ) : null}
        </div>

        <div className={styles.titleRow}>
          <h1 className={styles.title}>{product.title}</h1>
          {!isSellerView ? (
            <div className={styles.headingActions}>
              <LikeButton
                liked={isFav}
                onClick={onToggleFavorite}
                pending={favoritePending}
                aria-label={isFav ? "Убрать из избранного" : "Добавить в избранное"}
              />
              <ProductShareButton product={product} />
            </div>
          ) : null}
        </div>
        <div className={styles.productArticle}>
          <ProductArticleButton article={product.article} />
          {isSellerView && selectedVariant?.sellerArticle ? (
            <span>Артикул продавца: {selectedVariant.sellerArticle}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.priceBlock}>
        <div className={styles.price}>
          {priceLabel} ₽
        </div>
      </div>

      {product.description.trim() ? (
        <div className={styles.productDescription}>
          <ProductDescriptionText text={product.description} fallback="" />
        </div>
      ) : null}

      <div className={styles.variantBlock} ref={variantsRef}>
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

        <div className={styles.actions}>
          {isSellerView ? (
            <Button type="button" variant="primary" className={styles.addBtn} onClick={onEditProduct}>Редактировать</Button>
          ) : (
            <div className={styles.desktopPurchase}>
              <ProductVariantSelect variants={variants} selectedVariantId={selectedVariantId}
                onChange={onChangeVariant} onAdd={onAddToCart} adding={adding} success={addSuccess}
                className={styles.addBtn} />
            </div>
          )}
        </div>
        {!isSellerView ? (
          <div className={styles.mobilePurchase} data-product-purchase>
            <ProductVariantSelect variants={variants} selectedVariantId={selectedVariantId}
              onChange={onChangeVariant} onAdd={onAddToCart} adding={adding} success={addSuccess}
              className={styles.mobilePurchaseButton} />
          </div>
        ) : null}
      </div>

      <ProductDetailsAccordion
        product={product}
        openComposition={openComposition}
        openBrand={openBrand}
        onToggleComposition={onToggleComposition}
        onToggleBrand={onToggleBrand}
      />
    </aside>
  );
}
