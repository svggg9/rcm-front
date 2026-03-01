"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./ProductTile.module.css";

type Variant = { price: number };

type Product = {
  id: number;
  title: string;
  images: string[];
  variants: Variant[];
  brand: string;
};

export function ProductTile({ product }: { product: Product }) {
  const mainImage = product.images?.[0];
  const hoverImage = product.images?.[1];

  const prices = product.variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;

  const [imageLoaded, setImageLoaded] = useState(false);

  function onLike(e: React.MouseEvent) {
    e.preventDefault(); // чтобы не открывало карточку
    e.stopPropagation();
    // TODO: тут потом сохранение в "избранное"
    console.log("like", product.id);
  }

  return (
    <li className={styles.item}>
      <Link href={`/product/${product.id}`} className={styles.link}>
        <div className={styles.media}>
          {!imageLoaded && <div className={styles.skeleton} />}

          {mainImage ? (
            <img
              src={mainImage}
              alt={product.title}
              className={styles.imgMain}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className={styles.noImage}>Нет изображения</div>
          )}

          {hoverImage && (
            <img
              src={hoverImage}
              alt={product.title}
              className={styles.imgHover}
              loading="lazy"
            />
          )}
        </div>

        <div className={styles.info}>
          <div className={styles.brand}>{product.brand}</div>
          <div className={styles.title}>{product.title}</div>
          <div className={styles.price}>{minPrice.toLocaleString()} ₽</div>
        </div>

        <button
          type="button"
          className={styles.like}
          onClick={onLike}
          aria-label="Сохранить"
          title="Сохранить"
        >
          <img src="/icons/profile.svg" alt="" aria-hidden="true" />
        </button>
      </Link>
    </li>
  );
}