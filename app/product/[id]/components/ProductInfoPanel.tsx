"use client";

import Link from "next/link";
import { Button } from "../../../components/ui/Button";
import { LikeButton } from "../../../components/ui/LikeButton";
import { ProductPhoto } from "../../../components/ProductPhoto";
import { productColorPath } from "../../../lib/productUrls";
import { productSummary } from "../../../lib/productPresentation";
import { ProductArticleButton } from "./ProductArticleButton";
import { ProductShareButton } from "./ProductShareButton";
import { ProductDetailsAccordion } from "./ProductDetailsAccordion";
import { ProductVariantSelect } from "./ProductVariantSelect";
import styles from "../ProductPage.module.css";
import type { Product, Variant } from "../lib/types";

type Props = {
  product: Product; variants: Variant[]; selectedVariantId: number | null;
  onChangeVariant: (variantId: number) => void; selectedVariant: Variant | null;
  currentPrice: number; adding: boolean; addSuccess: boolean; isFav: boolean;
  favoritePending: boolean; onAddToCart: (variantId?: number) => void;
  onToggleFavorite: () => void | Promise<void>; isSellerView: boolean;
  onEditProduct: () => void; selectedColorwayId: number | null;
  onChangeColorway: (colorwayId: number) => void;
};

export function ProductInfoPanel({ product, variants, selectedVariantId, onChangeVariant,
  selectedVariant, currentPrice, adding, addSuccess, isFav, favoritePending, onAddToCart,
  onToggleFavorite, isSellerView, onEditProduct, selectedColorwayId, onChangeColorway }: Props) {
  const colorways = product.colorways ?? [];
  const selectedColorway = colorways.find(color => color.id === selectedColorwayId) ?? null;
  const variantColors = [...new Set(variants.map(variant => variant.color?.trim()).filter(Boolean))];
  const colorName = selectedColorway?.color?.trim() || selectedVariant?.color?.trim() || (variantColors.length === 1 ? variantColors[0] : null);
  const prices = variants.map(variant => variant.price);
  const minPrice = prices.length ? Math.min(...prices) : currentPrice;
  const maxPrice = prices.length ? Math.max(...prices) : currentPrice;
  const priceLabel = !selectedVariant && minPrice !== maxPrice
    ? `${minPrice.toLocaleString("ru-RU")}–${maxPrice.toLocaleString("ru-RU")}` : currentPrice.toLocaleString("ru-RU");
  const returnPath = productColorPath(product, selectedColorway?.id);
  const brandHref = product.brandSlug ? `/brand/${product.brandSlug}?returnTo=${encodeURIComponent(returnPath)}` : null;
  const summary = productSummary(product.description);

  return <aside className={styles.info} aria-label="Информация о товаре">
    <div className={styles.heading}>
      {product.brand.trim() ? brandHref
        ? <Link href={brandHref} className={styles.brand}>{product.brand}</Link>
        : <div className={styles.brand}>{product.brand}</div> : null}
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{product.title}</h1>
        {!isSellerView && <div className={styles.headingActions}>
          <LikeButton liked={isFav} onClick={onToggleFavorite} pending={favoritePending}
            aria-label={isFav ? "Убрать из избранного" : "Добавить в избранное"} />
          <ProductShareButton product={product} colorwayId={selectedColorway?.id} />
        </div>}
      </div>
      {variants.length > 0 && <div className={styles.priceBlock}><div className={styles.price}>{priceLabel} ₽</div></div>}
    </div>

    <div className={styles.variantBlock}>
      <div className={styles.productMeta}>
        {colorName && <span className={styles.colorName} aria-label={`Цвет: ${colorName}`}>{colorName}</span>}
        <div className={styles.productArticle}><ProductArticleButton article={product.article} /></div>
      </div>
      {colorways.length > 1 && <div className={styles.colorwayList} role="group" aria-label="Цвет товара">
        {colorways.map(colorway => <button key={colorway.id} type="button" className={styles.colorwayOption}
          disabled={adding} onClick={() => onChangeColorway(colorway.id)}
          aria-label={`Цвет: ${colorway.color || "не указан"}`} aria-pressed={colorway.id === selectedColorway?.id}>
          {colorway.images?.[0] ? <ProductPhoto src={colorway.images[0]} alt="" sizes="64px"
            className={styles.colorwayImage} normalizeWhitespace />
            : <span className={styles.colorwaySwatch} style={{ backgroundColor: colorway.colorHex || "#f7f7f7" }} aria-hidden="true" />}
        </button>)}
      </div>}
      {isSellerView ? <Button type="button" variant="primary" className={styles.addBtn} onClick={onEditProduct}>Редактировать</Button>
        : <>
          <div className={styles.desktopPurchase}>
            <ProductVariantSelect variants={variants} selectedVariantId={selectedVariantId} onChange={onChangeVariant}
              onAdd={onAddToCart} adding={adding} success={addSuccess} className={styles.addBtn} />
          </div>
          <div className={styles.mobilePurchase} data-product-purchase>
            <ProductVariantSelect variants={variants} selectedVariantId={selectedVariantId} onChange={onChangeVariant}
              onAdd={onAddToCart} adding={adding} success={addSuccess} className={styles.mobilePurchaseButton} />
          </div>
        </>}
      {isSellerView && selectedVariant?.sellerArticle && <div className={styles.sellerArticle}>Артикул продавца: {selectedVariant.sellerArticle}</div>}
    </div>

    {summary.text && <p className={styles.productDescription}>{summary.text}</p>}
    <ProductDetailsAccordion product={product} showDescription={summary.hasMore} brandHref={brandHref} />
  </aside>;
}
