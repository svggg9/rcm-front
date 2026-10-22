"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./Favorites.module.css";
import { apiFetch, API_URL } from "../lib/api";
import { getClientSession } from "../lib/client-session";
import { getGuestFavoriteIds } from "../lib/favorites";
import { EmptyState } from "../components/ui/EmptyState";
import { RequestError } from "../components/ui/RequestError";
import { AUTH_EVENT, SESSION_IDENTITY_EVENT } from "../lib/authEvents";
import { SectionLoader } from "../components/ui/SectionLoader";
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
  const readVersion = useRef(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      const requestId = ++readVersion.current;
      const current = () => alive && requestId === readVersion.current;
      setLoading(true);

      try {
        const session = await getClientSession();
        if (!current()) return;

        if (session) {
          const response = await apiFetch(`${API_URL}/api/favorites`);
          if (!response.ok) {
            throw new Error("favorites load failed");
          }

          const data: ProductApi[] = await response.json();
          if (!current()) return;
          if (!Array.isArray(data)) throw new Error("Invalid favorites");
          setProducts(data.map(toTileProduct));
          setLoadError(false);
          return;
        }

        const guestIds = getGuestFavoriteIds();

        if (!guestIds.length) {
          if (!current()) return;
          setProducts([]);
          setLoadError(false);
          return;
        }

        const response = await apiFetch(
          `${API_URL}/api/products/public-by-ids?ids=${guestIds.join(",")}`
        );
        if (!response.ok) {
          throw new Error("products load failed");
        }

        const data: ProductApi[] = await response.json();
        if (!current()) return;
        if (!Array.isArray(data)) throw new Error("Invalid favorites");

        const idSet = new Set(guestIds);
        const filtered = (Array.isArray(data) ? data : [])
          .filter((product) => idSet.has(product.id))
          .sort((a, b) => guestIds.indexOf(a.id) - guestIds.indexOf(b.id))
          .map(toTileProduct);

        setProducts(filtered);
        setLoadError(false);
      } catch {
        if (!current()) return;

        setLoadError(true);
      } finally {
        if (!current()) return;
        setLoading(false);
      }
    }

    void load();

    function handleAuthChanged() {
      setProducts([]);
      setLoadError(false);
      void load();
    }

    window.addEventListener(AUTH_EVENT, handleAuthChanged);
    window.addEventListener(SESSION_IDENTITY_EVENT, handleAuthChanged);

    return () => {
      alive = false;
      window.removeEventListener(AUTH_EVENT, handleAuthChanged);
      window.removeEventListener(SESSION_IDENTITY_EVENT, handleAuthChanged);
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
      const fallbackCandidates = fallback.blocks;
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

      const firstFallback = fallback.blocks[0];
      if (automatic.length === 0 && firstFallback?.products.length) {
        automatic.push({
          key: "automatic-latest",
          title: firstFallback.title,
          href: firstFallback.href,
          products: firstFallback.products,
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
          {loadError && products.length > 0 ? <RequestError variant="inline" message="Не удалось обновить избранное"
            text="Показаны последние загруженные данные" loading={loading} onRetry={() => setReload(value => value + 1)} /> : null}
          {loading && !products.length && !loadError ? (
            <SectionLoader label="Загрузка избранного" />
          ) : loadError && !products.length ? (
            <RequestError message="Не удалось загрузить избранное" loading={loading} onRetry={() => setReload(value => value + 1)} />
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
