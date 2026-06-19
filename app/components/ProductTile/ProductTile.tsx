"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";

import styles from "./ProductTile.module.css";
import { Price } from "../ui/Price";
import { useFavorites } from "../../lib/FavoritesContext";

type Product = {
  id: number;
  title: string;
  images: string[];
  brand: string | null;
  brandSlug?: string | null;
  minPrice: number;
};

export function ProductTile({ product }: { product: Product }) {
  const router = useRouter();
  const mainImage = product.images?.[0];
  const hoverImage = product.images?.[1];
  const hasHoverImage = hoverImage && hoverImage !== mainImage;

  const { favoriteIds, toggle } = useFavorites();
  const fav = favoriteIds.includes(product.id);

  const prefetchedRef = useRef(false);

  const imageSizes =
    "(max-width: 599px) 50vw, (max-width: 899px) 50vw, (max-width: 1199px) 33vw, 25vw";

  function prefetchProduct() {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    if (window.innerWidth > 768) {
      router.prefetch(`/product/${product.id}`);
    }
  }

  async function onLike(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    await toggle(product.id);
  }

  return (
    <li className={styles.item}>
      <article className={styles.card}>
        <div className={styles.mediaWrap}>
          <Link
            href={`/product/${product.id}`}
            className={styles.mediaLink}
            onMouseEnter={prefetchProduct}
            onFocus={prefetchProduct}
          >
            {mainImage ? (
              <Image
                src={mainImage}
                alt={product.title}
                fill
                sizes={imageSizes}
                className={styles.imgMain}
              />
            ) : (
              <div className={styles.noImage}>Нет изображения</div>
            )}

            {hasHoverImage ? (
              <Image
                src={hoverImage}
                alt=""
                fill
                sizes={imageSizes}
                className={styles.imgHover}
              />
            ) : null}
          </Link>

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
        </div>

        <div className={styles.info}>
          {product.brand ? (
            <span className={styles.brandText}>{product.brand}</span>
          ) : null}

          <div className={styles.title}>{product.title}</div>

          <div className={styles.price}>
            {product.minPrice > 0 ? <Price amount={product.minPrice} /> : "Цена по запросу"}
          </div>
        </div>
      </article>
    </li>
  );
}
