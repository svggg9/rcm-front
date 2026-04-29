"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const mainImage = product.images?.[0];
  const hoverImage = product.images?.[1];

  const { favoriteIds, toggle } = useFavorites();
  const fav = favoriteIds.includes(product.id);

  const prefetchedRef = useRef(false);

  function prefetchProduct() {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    router.prefetch(`/product/${product.id}`);
  }

  async function onLike(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    await toggle(product.id);
  }

  return (
    <li className={styles.item}>
      <Link
        href={`/product/${product.id}`}
        className={styles.link}
        onMouseEnter={prefetchProduct}
        onFocus={prefetchProduct}
      >
        <div className={styles.media}>
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 280px"
              className={styles.imgMain}
            />
          ) : (
            <div className={styles.noImage}>Нет изображения</div>
          )}

          {hoverImage ? (
            <Image
              src={hoverImage}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 280px"
              className={styles.imgHover}
            />
          ) : null}
        </div>

        <div className={styles.info}>
          <div className={styles.brand}>{product.brand}</div>
          <div className={styles.title}>{product.title}</div>
          <div className={styles.price}>
            {product.minPrice.toLocaleString("ru-RU")} ₽
          </div>
        </div>

        <button
          type="button"
          className={`${styles.like} ${fav ? styles.liked : ""}`}
          onClick={onLike}
          aria-label={fav ? "Убрать из избранного" : "Сохранить"}
          title={fav ? "Убрать" : "Сохранить"}
        >
          <Image
            src={fav ? "/icons/like-filled.svg" : "/icons/like.svg"}
            alt=""
            width={20}
            height={20}
            aria-hidden="true"
          />
        </button>
      </Link>
    </li>
  );
}