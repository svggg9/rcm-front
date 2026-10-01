"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "../../lib/api";
import { loadResolvedCart } from "../../lib/cartAuthority";
import { getClientSession } from "../../lib/client-session";
import { getGuestFavoriteIds } from "../../lib/favorites";
import { mapProductToCarouselProduct } from "../../lib/productMappers";
import { AUTH_EVENT } from "../../lib/authEvents";
import { CART_EVENT } from "../../lib/cartEvents";
import { FAVORITES_EVENT } from "../../lib/favorites";
import { ProductShowcase } from "../ProductShowcase/ProductShowcase";

type Product = {
  id: number;
  publicId?: string | null;
  title: string;
  brand: string | null;
  category: string | null;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  coverImage?: string | null;
  hoverImage?: string | null;
  minPrice?: number | null;
  inStock?: boolean;
};

type Props = {
  seedIds?: number[];
  excludeIds?: number[];
  audience?: "men" | "women" | "all";
  className?: string;
};

export function RecommendationsShowcase({ seedIds, excludeIds = [], audience = "all", className }: Props) {
  const seedKey = seedIds?.join(",");
  const excludeKey = excludeIds.join(",");
  const [automaticSeeds, setAutomaticSeeds] = useState<number[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadedKey, setLoadedKey] = useState("");

  useEffect(() => {
    if (seedIds !== undefined) return;
    let active = true;

    async function loadSeeds() {
      const [cart, session] = await Promise.all([
        loadResolvedCart().catch(() => ({ items: [] })),
        getClientSession().catch(() => null),
      ]);
      let favorites = getGuestFavoriteIds();
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
      if (active) setAutomaticSeeds([...new Set([...cart.items.map((item) => item.productId), ...favorites])]);
    }

    void loadSeeds();
    window.addEventListener(AUTH_EVENT, loadSeeds);
    window.addEventListener(CART_EVENT, loadSeeds);
    window.addEventListener(FAVORITES_EVENT, loadSeeds);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, loadSeeds);
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
      const search = new URLSearchParams({ page: "0", size: "24", sort: "newest" });
      if (audience !== "all") search.set("audience", audience);
      const lists = await Promise.all(ids.map(async (id): Promise<Product[]> => {
        try {
          const response = await apiFetch(`${API_URL}/api/products/${id}/related?limit=12`);
          if (!response.ok) return [];
          const data: unknown = await response.json();
          return Array.isArray(data) ? data as Product[] : [];
        } catch {
          return [];
        }
      }));
      let newest: Product[] = [];
      try {
        const response = await apiFetch(`${API_URL}/api/products/page?${search}`);
        if (response.ok) {
          const data: { content?: Product[] } = await response.json();
          newest = Array.isArray(data.content) ? data.content : [];
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
    }

    void loadProducts();
    return () => { active = false; };
  }, [requestKey, audience]);

  const visibleProducts = useMemo(() => {
    if (loadedKey !== requestKey) return [];
    const seen = new Set([...effectiveSeeds, ...excludeIds]);
    return products.filter((product) => {
      if (product.inStock === false || seen.has(product.id)) return false;
      if (audience !== "all" && product.audience !== "UNISEX" && product.audience !== audience.toUpperCase()) return false;
      seen.add(product.id);
      return true;
    }).slice(0, 12);
  // Keys capture the contents of the caller's arrays without refetching on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, loadedKey, requestKey, seedKey, excludeKey, automaticSeeds, audience]);

  return <ProductShowcase variant="carousel" title="Возможно, вам понравится" products={visibleProducts.map(mapProductToCarouselProduct)} href="/catalog" actionLabel="Смотреть всё" className={className} />;
}
