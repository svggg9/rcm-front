"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./ProductTile.module.css";
import { useFavorites } from "../../lib/FavoritesContext";

type Product = {
  id: number;
  title: string;
  images: string[];
  brand: string | null;
  minPrice: number;
};

export function ProductTile({ product }: { product: Product }) {
  const mainImage = product.images?.[0];
  const hoverImage = product.images?.[1];

  const [imageLoaded, setImageLoaded] = useState(false);

  const { favoriteIds, toggle } = useFavorites();
  const fav = favoriteIds.includes(product.id);

  async function onLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await toggle(product.id);
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
          <div className={styles.price}>{product.minPrice.toLocaleString()} ₽</div>
        </div>

        <button
          type="button"
          className={`${styles.like} ${fav ? styles.liked : ""}`}
          onClick={onLike}
          aria-label={fav ? "Убрать из избранного" : "Сохранить"}
          title={fav ? "Убрать" : "Сохранить"}
        >
          <img
            src={fav ? "/icons/like-filled.svg" : "/icons/like.svg"}
            alt=""
            aria-hidden="true"
          />
        </button>
      </Link>
    </li>
  );
}