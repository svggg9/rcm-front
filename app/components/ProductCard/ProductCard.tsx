"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./ProductCard.module.css";

type Variant = {
  price: number;
};

type Product = {
  id: number;
  title: string;
  images: string[];
  variants: Variant[];
  brand: string;
};

export function ProductCard({ product }: { product: Product }) {
  const mainImage = product.images?.[0];
  const hoverImage = product.images?.[1];

  const prices = product.variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;

  return (
    <Link href={`/product/${product.id}`} className="block">
      <div className={styles.productCard}>
        <div className={styles.imageWrapper}>
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 300px"
              className={styles.imageMain}
            />
          ) : (
            <div className="image-placeholder">Нет изображения</div>
          )}

          {hoverImage ? (
            <Image
              src={hoverImage}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 300px"
              className={styles.imageHover}
            />
          ) : null}
        </div>

        <div className={styles.cardText}>
          <div className={styles.cardTitle}>
            {product.brand} {product.title}
          </div>
          <div className={styles.cardPrice}>
            {minPrice.toLocaleString("ru-RU")} ₽
          </div>
        </div>
      </div>
    </Link>
  );
}