"use client";

import { useEffect, useState } from "react";
import styles from "./Favorites.module.css";
import Link from "next/link";
import Image from "next/image";
import { ensureCartId } from "../lib/auth";
import { emitCartChanged } from "../lib/cartEvents";
import { addVariantToCart } from "../product/[id]/lib/productPageApi";
import { apiFetch, API_URL } from "../lib/api";
import { getGuestFavoriteIds } from "../lib/favorites";
import { toast } from "sonner";
import { Loader } from "../components/ui/Loader";

type ProductVariantApi = {
  id: number;
  size: string;
  color: string;
  price: number;
  availableQuantity: number | null;
};

type ProductApi = {
  id: number;
  title: string;
  brand: string | null;
  category: string | null;
  images: string[];
  minPrice?: number;
  variants?: ProductVariantApi[];
};

type FavoriteProductDto = {
  id: number;
  title: string;
  brand: string | null;
  category: string | null;
  images: string[];
  minPrice: number;
  variants: ProductVariantApi[];
  isFavorite: boolean;
};

function resolveMinPrice(product: ProductApi): number {
  if (typeof product.minPrice === "number") {
    return product.minPrice;
  }

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const prices = product.variants
      .map((variant) => variant?.price)
      .filter((price): price is number => typeof price === "number");

    if (prices.length > 0) {
      return Math.min(...prices);
    }
  }

  return 0;
}

function toTileProduct(product: ProductApi): FavoriteProductDto {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand ?? null,
    category: product.category ?? null,
    images: Array.isArray(product.images) ? product.images : [],
    minPrice: resolveMinPrice(product),
    variants: Array.isArray(product.variants) ? product.variants : [],
    isFavorite: true,
  };
}

export default function FavoritesPage() {
  const [products, setProducts] = useState<FavoriteProductDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      try {
          const profileResponse = await apiFetch(`${API_URL}/api/profile`);

          if (profileResponse.ok) {
          const response = await apiFetch(`${API_URL}/api/favorites`);
          if (!response.ok) {
            throw new Error("favorites load failed");
          }

          const data: ProductApi[] = await response.json();
          if (!alive) return;

          setProducts(Array.isArray(data) ? data.map(toTileProduct) : []);
          return;
        }

        const guestIds = getGuestFavoriteIds();

        if (!guestIds.length) {
          if (!alive) return;
          setProducts([]);
          return;
        }

        const response = await apiFetch(`${API_URL}/api/products/list`);
        if (!response.ok) {
          throw new Error("products load failed");
        }

        const data: ProductApi[] = await response.json();
        if (!alive) return;

        const idSet = new Set(guestIds);

        const filtered = (Array.isArray(data) ? data : [])
          .filter((product) => idSet.has(product.id))
          .sort((a, b) => guestIds.indexOf(a.id) - guestIds.indexOf(b.id))
          .map(toTileProduct);

        setProducts(filtered);
      } catch (error) {
        if (!alive) return;

        setProducts([]);
        toast.error(
          error instanceof Error ? error.message : "Не удалось загрузить избранное"
        );
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    function handleAuthChanged() {
      load();
    }

    window.addEventListener("auth-changed", handleAuthChanged);

    return () => {
      alive = false;
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  async function handleAddToCart(product: FavoriteProductDto) {
    if (product.variants.length === 0) {
      window.location.href = `/product/${product.id}`;
      return;
    }

    const availableVariants = product.variants.filter(
      (variant) =>
        variant.availableQuantity === null || variant.availableQuantity > 0
    );

    if (availableVariants.length === 0) {
      toast.error("Товар распродан");
      return;
    }

    if (availableVariants.length > 1) {
      window.location.href = `/product/${product.id}`;
      return;
    }

    try {
      const cartId = await ensureCartId();

      if (!cartId) {
        toast.error("Не удалось создать корзину");
        return;
      }

      await addVariantToCart({
        cartId,
        variantId: availableVariants[0].id,
        qty: 1,
      });

      emitCartChanged();
      toast.success("Товар добавлен в корзину");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось добавить в корзину"
      );
    }
  }

  async function handleToggleFavorite(productId: number) {
    const target = products.find((product) => product.id === productId);
    if (!target) return;

    const nextIsFavorite = !target.isFavorite;

    setProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? { ...product, isFavorite: nextIsFavorite }
          : product
      )
    );

    window.dispatchEvent(new Event("favorites-changed"));

    toast(nextIsFavorite ? "Добавлено в избранное" : "Удалено из избранного");
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Избранное</h1>

        {!loading ? (
          <div className={styles.count}>
            Всего товаров: {products.length}
          </div>
        ) : null}
      </div>
        {loading ? (
          <Loader label="Загружаем избранное" />
        ) : products.length === 0 ? (
        <div className="emptyState">
          <div className="emptyStateTitle">В избранном пока пусто</div>
          <div className="emptyStateText">
            Сохраняйте товары, чтобы вернуться к ним позже.
          </div>
        </div>
        ) : (
      <ul className={styles.grid}>
        {products.map((product) => {
          const hasVariants = product.variants.length > 0;

          const availableVariants = product.variants.filter(
            (variant) =>
              variant.availableQuantity === null || variant.availableQuantity > 0
          );

          const isSoldOut = hasVariants && availableVariants.length === 0;
          const shouldSelectSize = !hasVariants || availableVariants.length > 1;
          const hasSingleVariant = availableVariants.length === 1;

          return (
            <li key={product.id} className={styles.card}>
              <Link href={`/product/${product.id}`} className={styles.cardLink}>
                <div className={styles.imageBox}>
                  {product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      fill
                      sizes="(max-width: 900px) 50vw, 25vw"
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
                className={styles.removeFavorite}
                onClick={() => void handleToggleFavorite(product.id)}
                aria-label={
                  product.isFavorite
                    ? "Убрать из избранного"
                    : "Добавить в избранное"
                }
              >
                <Image
                  src={product.isFavorite ? "/icons/like-filled.svg" : "/icons/like.svg"}
                  alt=""
                  width={18}
                  height={18}
                />
              </button>

              {!isSoldOut ? (
                <div className={styles.cardActions}>
                  {hasSingleVariant ? (
                    <div className={styles.sizeHint}>
                      Доступно только в одном размере
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="buttonSecondary wFull"
                    onClick={() => void handleAddToCart(product)}
                  >
                    {shouldSelectSize ? "Выбрать размер" : "Добавить в корзину"}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
        )}
      </div>
    </div>
  );
}