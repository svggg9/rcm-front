"use client";

import { useEffect, useState } from "react";

import styles from "./Favorites.module.css";
import { apiFetch, API_URL } from "../lib/api";
import { getClientSession } from "../lib/client-session";
import { getGuestFavoriteIds } from "../lib/favorites";
import { EmptyState } from "../components/ui/EmptyState";
import { ProductTileSkeleton } from "../components/ui/CommerceSkeleton";
import Link from "next/link";
import { FavoriteCard } from "./FavoriteCard";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { ProductShowcase } from "../components/ProductShowcase/ProductShowcase";
import type { CarouselProduct } from "../components/ProductCarousel/types";
import { getStorefrontHome } from "../home/lib/getStorefrontHome";
import { getHomePageData } from "../home/lib/getHomePageData";

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

type FavoriteCollection = {
  key: string;
  title: string;
  href: string;
  products: CarouselProduct[];
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
  const [collections, setCollections] = useState<FavoriteCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [collectionsOpen, setCollectionsOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setLoadError(false);

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
      } catch {
        if (!alive) return;

        setLoadError(true);
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
  }, [reload]);

  useEffect(() => {
    let alive = true;

    async function loadCollections() {
      const storefront = await getStorefrontHome();
      if (!alive) return;

      const managed = (storefront?.collections ?? [])
        .map((collection) => ({
          key: `managed-${collection.id}`,
          title: collection.title,
          href: `/catalog?collection=${collection.id}`,
          products: collection.products.map((product) => ({
            id: product.id,
            publicId: product.publicId,
            title: product.title,
            brand: product.brand,
            category: product.category,
            images: [product.coverImage, product.hoverImage].filter(
              (image): image is string => Boolean(image)
            ),
            minPrice: product.minPrice,
          })),
        }))
        .filter((collection) => collection.products.length > 0)
        .slice(0, 3);

      if (managed.length > 0) {
        setCollections(managed);
        return;
      }

      const fallback = await getHomePageData("all");
      if (!alive) return;

      const seenProductIds = new Set<number>();
      const fallbackCandidates = [
        fallback.brandShowcase,
        fallback.categoryShowcase,
        fallback.latestShowcase,
      ];
      const automatic = fallbackCandidates.flatMap((collection, index) => {
        const uniqueProducts = collection.products.filter(
          (product) => !seenProductIds.has(product.id)
        );

        if (uniqueProducts.length < 2) return [];

        uniqueProducts.forEach((product) => seenProductIds.add(product.id));

        return [{
          key: `automatic-${index}`,
          title: collection.title,
          href: collection.href,
          products: uniqueProducts,
        }];
      });

      if (automatic.length === 0 && fallback.latestShowcase.products.length > 0) {
        automatic.push({
          key: "automatic-latest",
          title: fallback.latestShowcase.title,
          href: fallback.latestShowcase.href,
          products: fallback.latestShowcase.products,
        });
      }

      setCollections(automatic);
    }

    void loadCollections().catch(() => { /* Optional content must not block favorites. */ });

    return () => {
      alive = false;
    };
  }, []);

  function handleFavoriteChange(productId: number, isFavorite: boolean) {
    if (isFavorite) return;

    setProducts((current) => current.filter((product) => product.id !== productId));
  }

  function handleCollectionFavoriteChange(
    product: CarouselProduct,
    isFavorite: boolean
  ) {
    if (!isFavorite) {
      setProducts((current) => current.filter((item) => item.id !== product.id));
      return;
    }

    setProducts((current) => {
      if (current.some((item) => item.id === product.id)) return current;
      return [...current, product];
    });
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Избранное</h1>

          {collections.length > 0 && <Button variant="secondary" className={styles.collectionsToggle} onClick={() => setCollectionsOpen(true)}>Подборки</Button>}
        </div>

        <div>
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
          ) : loadError ? (
            <div className={styles.errorState} role="alert"><p>Не удалось загрузить избранное</p><Button variant="secondary" onClick={() => setReload(value => value + 1)}>Повторить</Button></div>
          ) : products.length === 0 ? (
            <EmptyState title="В избранном пока пусто" text="Сохраняйте товары, чтобы вернуться к ним позже" actions={<Link href="/catalog" className="buttonPrimary">Перейти в каталог</Link>} />
          ) : (
            <ul className={styles.grid}>
              {products.map((product) => (
                <FavoriteCard
                  key={product.id}
                  product={product}
                  onRemove={handleFavoriteChange}
                />
              ))}
            </ul>
          )}
        </div>

        {collectionsOpen && <Dialog title="Подборки" size="wide" mobileFullscreen onClose={() => setCollectionsOpen(false)} actions={null}>
          <section className={styles.collections} aria-label="Подборки">
            <div className={styles.collectionList}>
              {collections.map((collection) => (
                <ProductShowcase
                  key={collection.key}
                  className={styles.collection}
                  title={collection.title}
                  products={collection.products}
                  variant="grid"
                  density="compact"
                  href={collection.href}
                  actionLabel="Смотреть все"
                  onFavoriteChange={handleCollectionFavoriteChange}
                />
              ))}
            </div>
          </section>
        </Dialog>}
      </div>
    </div>
  );
}
