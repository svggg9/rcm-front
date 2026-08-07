"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import styles from "./ProductTile.module.css";
import { Price } from "../ui/Price";
import { useFavorites } from "../../lib/FavoritesContext";
import { productPath } from "../../lib/productUrls";

type Product = {
  id: number;
  publicId?: string | null;
  title: string;
  images: string[];
  brand: string | null;
  brandSlug?: string | null;
  minPrice: number;
};

export function ProductTile({
  product,
  onFavoriteChange,
}: {
  product: Product;
  onFavoriteChange?: (productId: number, isFavorite: boolean) => void;
}) {
  const router = useRouter();
  const mainImage = product.images?.[0];
  const hoverImage = product.images?.[1];
  const hasHoverImage = hoverImage && hoverImage !== mainImage;

  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const [favoritePending, setFavoritePending] = useState(false);
  const [hoverImageRequested, setHoverImageRequested] = useState(false);
  const favoritePendingRef = useRef(false);

  const prefetchedRef = useRef(false);
  const prefetchTimerRef = useRef<number | null>(null);

  const imageSizes =
    "(max-width: 599px) 50vw, (max-width: 899px) 50vw, (max-width: 1199px) 33vw, 25vw";
  const productHref = productPath(product);

  function scheduleProductPrefetch() {
    if (prefetchedRef.current || prefetchTimerRef.current !== null) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    prefetchTimerRef.current = window.setTimeout(() => {
      prefetchTimerRef.current = null;
      prefetchedRef.current = true;
      router.prefetch(productHref);
    }, 140);
  }

  function cancelProductPrefetch() {
    if (prefetchTimerRef.current === null) return;
    window.clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
  }

  function handlePointerIntent() {
    if (
      hasHoverImage &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      setHoverImageRequested(true);
    }
    scheduleProductPrefetch();
  }

  useEffect(() => {
    return () => {
      if (prefetchTimerRef.current !== null) {
        window.clearTimeout(prefetchTimerRef.current);
      }
    };
  }, []);

  async function onLike(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (favoritePendingRef.current) return;

    try {
      favoritePendingRef.current = true;
      setFavoritePending(true);
      const nextFavorite = !fav;
      await toggle(product.id);
      onFavoriteChange?.(product.id, nextFavorite);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось обновить избранное"
      );
    } finally {
      favoritePendingRef.current = false;
      setFavoritePending(false);
    }
  }

  return (
    <li className={styles.item}>
      <article className={styles.card}>
        <div className={styles.mediaWrap}>
          <Link
            href={productHref}
            prefetch={false}
            className={styles.mediaLink}
            onMouseEnter={handlePointerIntent}
            onMouseLeave={cancelProductPrefetch}
            onFocus={handlePointerIntent}
            onBlur={cancelProductPrefetch}
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

            {hasHoverImage && hoverImageRequested ? (
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
            disabled={favoritePending}
            aria-busy={favoritePending || undefined}
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
