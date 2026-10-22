"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL, apiFetch } from "../../lib/api";
import { loadResolvedCart } from "../../lib/cartAuthority";
import { getClientSession } from "../../lib/client-session";
import { getGuestFavoriteIds } from "../../lib/favorites";
import { mapProductToCarouselProduct } from "../../lib/productMappers";
import { AUTH_EVENT, SESSION_IDENTITY_EVENT } from "../../lib/authEvents";
import { CART_EVENT } from "../../lib/cartEvents";
import { FAVORITES_EVENT } from "../../lib/favorites";
import { ProductShowcase } from "../ProductShowcase/ProductShowcase";
import { RequestError } from "../ui/RequestError";
import { SectionLoader } from "../ui/SectionLoader";
import { normalizeHomeProducts } from "../../home/lib/homePresentation";

type Product = {
  id: number;
  publicId?: string | null;
  title: string;
  brand: string | null;
  category?: string | null;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  coverImage?: string | null;
  hoverImage?: string | null;
  minPrice?: number | null;
  inStock?: boolean;
  images?: string[];
};

type Props = {
  seedIds?: number[];
  excludeIds?: number[];
  audience?: "men" | "women" | "all";
  className?: string;
  presentation?: "default" | "storefront";
  mobileLayout?: "rail" | "grid";
};

export function RecommendationsShowcase({ seedIds, excludeIds = [], audience = "all", className, presentation = "default", mobileLayout = "rail" }: Props) {
  const seedKey = seedIds?.join(",");
  const excludeKey = excludeIds.join(",");
  const [automaticSeeds, setAutomaticSeeds] = useState<number[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loadedAttempt, setLoadedAttempt] = useState(-1);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const seedRequest = useRef(0);

  useEffect(() => {
    if (seedIds !== undefined) return;
    let active = true;

    async function loadSeeds() {
      const requestId = ++seedRequest.current;
      const [cart, session] = await Promise.all([
        loadResolvedCart().catch(() => ({ items: [] })),
        getClientSession().catch(() => undefined),
      ]);
      let favorites = session === null ? getGuestFavoriteIds() : [];
      if (session) {
        try {
          const response = await apiFetch(`${API_URL}/api/favorites`);
          if (response.ok) {
            const data: unknown = await response.json();
            favorites = Array.isArray(data)
              ? data.filter((item): item is { id: number } => typeof item?.id === "number").map((item) => item.id)
              : [];
          }
        } catch {
          // Cart and newest products still provide a useful fallback.
        }
      }
      if (active && requestId === seedRequest.current) setAutomaticSeeds([...new Set([...cart.items.map((item) => item.productId), ...favorites])]);
    }

    void loadSeeds();
    const identityChanged = () => { setAutomaticSeeds([]); void loadSeeds(); };
    window.addEventListener(AUTH_EVENT, identityChanged);
    window.addEventListener(SESSION_IDENTITY_EVENT, identityChanged);
    window.addEventListener(CART_EVENT, loadSeeds);
    window.addEventListener(FAVORITES_EVENT, loadSeeds);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, identityChanged);
      window.removeEventListener(SESSION_IDENTITY_EVENT, identityChanged);
      window.removeEventListener(CART_EVENT, loadSeeds);
      window.removeEventListener(FAVORITES_EVENT, loadSeeds);
    };
  }, [seedIds]);

  const effectiveSeeds = seedKey === undefined ? automaticSeeds : seedIds ?? [];
  const requestKey = `${effectiveSeeds.slice(0, 3).join(",")}|${audience}`;

  useEffect(() => {
    let active = true;
    const ids = requestKey.split("|")[0].split(",").filter(Boolean);

    async function loadProducts() {
      let successfulSources = 0;
      const search = new URLSearchParams({ page: "0", size: "24", sort: "newest" });
      if (audience !== "all") search.set("audience", audience);
      const lists = await Promise.all(ids.map(async (id): Promise<Product[]> => {
        try {
          const response = await apiFetch(`${API_URL}/api/products/${id}/related?limit=12`);
          if (!response.ok) return [];
          const data: unknown = await response.json();
          if (!Array.isArray(data)) return [];
          successfulSources += 1;
          return normalizeHomeProducts(data, audience);
        } catch {
          return [];
        }
      }));
      let newest: Product[] = [];
      try {
        const response = await apiFetch(`${API_URL}/api/products/page?${search}`);
        if (response.ok) {
          const data: unknown = await response.json();
          if (data && typeof data === "object" && "content" in data && Array.isArray(data.content)) {
            successfulSources += 1;
            newest = normalizeHomeProducts(data.content, audience);
          }
        }
      } catch {
        // Related products may still be available.
      }
      if (!active) return;

      const merged: Product[] = [];
      for (let index = 0; index < 12; index += 1) {
        for (const list of lists) {
          if (list[index]) merged.push(list[index]);
        }
      }
      setProducts([...merged, ...newest]);
      setLoadedKey(requestKey);
      setLoadedAttempt(attempt);
      setErrorKey(successfulSources ? null : requestKey);
    }

    void loadProducts();
    return () => { active = false; };
  }, [requestKey, audience, attempt]);

  const visibleProducts = useMemo(() => {
    if (loadedKey !== requestKey) return [];
    const seen = new Set([...(presentation === "storefront" ? [] : effectiveSeeds), ...excludeIds]);
    return products.filter((product) => {
      if (product.inStock === false || seen.has(product.id)) return false;
      if (audience !== "all" && product.audience !== "UNISEX" && product.audience !== audience.toUpperCase()) return false;
      seen.add(product.id);
      return true;
    }).slice(0, 12);
  // Keys capture the contents of the caller's arrays without refetching on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, loadedKey, requestKey, seedKey, excludeKey, automaticSeeds, audience, presentation]);

  if (presentation === "storefront") {
    const pending = loadedKey !== requestKey || loadedAttempt !== attempt;
    if (errorKey === requestKey) return <div className={className}><RequestError variant="inline"
      message="Не удалось загрузить рекомендации" onRetry={() => setAttempt(value => value + 1)} loading={pending} /></div>;
    if (pending) return <SectionLoader label="Загрузка рекомендаций" className={className} />;
    if (visibleProducts.length < 2) return null;
  }
  const search = new URLSearchParams();
  if (audience !== "all") search.set("audience", audience);
  return <ProductShowcase variant={presentation === "storefront" ? "grid" : "carousel"}
    presentation={presentation} mobileLayout={mobileLayout} title={presentation === "storefront" ? "Ещё для вас" : "Возможно, вам понравится"}
    products={visibleProducts.map(mapProductToCarouselProduct)} href={`/catalog${search.size ? `?${search}` : ""}`}
    actionLabel="Смотреть всё" className={className} />;
}
