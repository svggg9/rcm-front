"use client";

import Image from "next/image";
import Link from "next/link";

import styles from "../Wishlist.module.css";

type Variant = {
  id: number;
  size: string;
  color: string;
  price: number;
  availableQuantity: number | null;
};

type Product = {
  id: number;
  title: string;
  brand: string | null;
  images: string[];
  minPrice: number;
  variants?: Variant[];
};

type Props = {
  product: Product;
  onRemove: (productId: number) => void;
  onAddToCart: (variantId: number) => void;
};

export function WishlistProductCard({
  product,
  onRemove,
  onAddToCart,
}: Props) {
  const availableVariants =
    product.variants?.filter(
      (variant) =>
        variant.availableQuantity === null || variant.availableQuantity > 0
    ) ?? [];

  const isSoldOut = availableVariants.length === 0;
  const singleVariant = availableVariants.length === 1
    ? availableVariants[0]
    : null;

  return (
    <article className={styles.card}>
      <Link href={`/product/${product.id}`} className={styles.link}>
        <div className={styles.imageBox}>
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={styles.image}
            />
          ) : (
            <div className={styles.placeholder}>Нет фото</div>
          )}
        </div>

        <div className={styles.info}>
          <div className={styles.brand}>{product.brand || "Без бренда"}</div>
          <div className={styles.name}>{product.title}</div>

          <div className={isSoldOut ? styles.soldOut : styles.price}>
            {isSoldOut ? "Распродано" : `${product.minPrice.toLocaleString()} ₽`}
          </div>
        </div>
      </Link>

      <button
        type="button"
        className={styles.remove}
        onClick={() => onRemove(product.id)}
        aria-label="Удалить из избранного"
      >
        ×
      </button>

      <div className={styles.actions}>
        {!isSoldOut && singleVariant ? (
          <>
            <div className={styles.sizeHint}>
              Доступно только в одном размере
            </div>

            <button
              type="button"
              className="buttonSecondary wFull"
              onClick={() => onAddToCart(singleVariant.id)}
            >
              Добавить в корзину
            </button>
          </>
        ) : null}

        {!isSoldOut && !singleVariant ? (
          <Link href={`/product/${product.id}`} className="buttonSecondary wFull">
            Выбрать размер
          </Link>
        ) : null}
      </div>
    </article>
  );
}