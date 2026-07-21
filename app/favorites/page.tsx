"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import styles from "./Favorites.module.css";
import { apiFetch, API_URL } from "../lib/api";
import { getClientSession } from "../lib/client-session";
import { getGuestFavoriteIds } from "../lib/favorites";
import { EmptyState } from "../components/ui/EmptyState";
import { ProductTileSkeleton } from "../components/ui/CommerceSkeleton";
import { ProductTile } from "../components/ProductTile/ProductTile";

type ProductVariantApi = {
  id: number;
  size: string;
  color: string;
  price: number;
  availableQuantity: number | null;
};

type ProductApi = {
  id: number;
  publicId?: string | null;
  title: string;
  brand: string | null;
  brandSlug?: string | null;
  category: string | null;
  coverImage?: string | null;
  hoverImage?: string | null;
  images: string[];
  minPrice?: number;
  variants?: ProductVariantApi[];
};

type FavoriteProduct = {
  id: number;
  publicId?: string | null;
  title: string;
  brand: string | null;
  brandSlug?: string | null;
  images: string[];
  minPrice: number;
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

function toTileProduct(product: ProductApi): FavoriteProduct {
  const images = [
    product.coverImage,
    product.hoverImage && product.hoverImage !== product.coverImage
      ? product.hoverImage
      : null,
  ].filter((image): image is string => typeof image === "string" && image.length > 0);

  return {
    id: product.id,
    publicId: product.publicId,
    title: product.title,
    brand: product.brand ?? null,
    brandSlug: product.brandSlug ?? null,
    images: images.length > 0 ? images : Array.isArray(product.images) ? product.images : [],
    minPrice: resolveMinPrice(product),
  };
}

export default function FavoritesPage() {
  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      try {
        const session = await getClientSession();

        if (session) {
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

        const response = await apiFetch(
          `${API_URL}/api/products/public-by-ids?ids=${guestIds.join(",")}`
        );
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

  function handleFavoriteChange(productId: number, isFavorite: boolean) {
    if (isFavorite) return;

    setProducts((current) => current.filter((product) => product.id !== productId));
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Избранное</h1>

          {!loading ? (
            <div className={styles.count}>Товаров: {products.length}</div>
          ) : null}
        </div>

        {loading ? (
          <ul
            className={styles.grid}
            aria-label="Загрузка избранного"
            aria-busy="true"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductTileSkeleton key={index} />
            ))}
          </ul>
        ) : products.length === 0 ? (
          <EmptyState
            icon="heart"
            tone="gold"
            title="В избранном пока пусто"
            text="Сохраняйте товары, чтобы вернуться к ним позже"
          />
        ) : (
          <ul className={styles.grid}>
            {products.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
