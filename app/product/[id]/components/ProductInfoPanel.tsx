"use client";

import styles from "../ProductPage.module.css";

type Variant = {
  id: number;
  size: string;
  color: string;
  price: number;
  quantity: number;
  sku: string;
};

type Product = {
  id: number;
  title: string;
  description: string;
  brand: string;
  category: string;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  images: string[];
  variants: Variant[];
};

type Props = {
  product: Product;
  selectedVariantId: number | null;
  onChangeVariant: (variantId: number) => void;
  selectedVariant: Variant | null;
  currentPrice: number;
  sizesText: string;
  adding: boolean;
  isFav: boolean;
  onAddToCart: () => void;
  onToggleFavorite: () => void;
};

export function ProductInfoPanel({
  product,
  selectedVariantId,
  onChangeVariant,
  selectedVariant,
  currentPrice,
  sizesText,
  adding,
  isFav,
  onAddToCart,
  onToggleFavorite,
}: Props) {
  return (
    <aside className={styles.info}>
      <div className={styles.label}>Новый сезон</div>

      <div className={styles.heading}>
        <div className={styles.brand}>{product.brand}</div>
        <h1 className={styles.title}>{product.title}</h1>
      </div>

      <div className={styles.priceBlock}>
        <div className={styles.price}>{currentPrice.toLocaleString()} ₽</div>
        <div className={styles.priceNote}>
          {selectedVariant
            ? `Размер ${selectedVariant.size}${
                selectedVariant.color ? ` · ${selectedVariant.color}` : ""
              }`
            : "Цена указана за базовый вариант"}
        </div>
      </div>

      <div className={styles.variantBlock}>
        <div className={styles.variantHeader}>Выберите размер</div>

        <select
          className={styles.sizeSelect}
          value={selectedVariantId ?? ""}
          onChange={(event) => onChangeVariant(Number(event.target.value))}
        >
          {product.variants.map((variant) => (
            <option
              key={variant.id}
              value={variant.id}
              disabled={variant.quantity <= 0}
            >
              {variant.size} — {variant.price.toLocaleString()} ₽
              {variant.quantity <= 0 ? " (нет в наличии)" : ""}
            </option>
          ))}
        </select>

        <div className={styles.variantText}>{sizesText}</div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={onAddToCart}
            disabled={adding || !selectedVariant || selectedVariant.quantity <= 0}
          >
            {adding ? "Добавляем…" : "Добавить в корзину"}
          </button>

          <button
            type="button"
            className={`${styles.favoriteBtn} ${
              isFav ? styles.favoriteBtnActive : ""
            }`}
            onClick={onToggleFavorite}
          >
            <span>{isFav ? "В избранном" : "В избранное"}</span>
            <img
              src={isFav ? "/icons/like-filled.svg" : "/icons/like.svg"}
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div className={styles.delivery}>
        <div className={styles.deliveryTitle}>Примерная дата доставки:</div>
        <div className={styles.deliveryText}>9 апр. - 13 апр.</div>
      </div>
    </aside>
  );
}