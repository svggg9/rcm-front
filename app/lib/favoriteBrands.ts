"use client";

import { useEffect, useSyncExternalStore } from "react";

import { apiFetch, API_URL } from "./api";
import { AUTH_EVENT } from "./authEvents";
import { getClientSession } from "./client-session";

export type FavoriteBrand = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
  images?: {
    id: number;
    imageUrl: string;
    sortOrder: number;
  }[];
};

type Snapshot = {
  brands: FavoriteBrand[];
  loading: boolean;
};

const EMPTY_BRANDS: FavoriteBrand[] = [];
const SERVER_SNAPSHOT: Snapshot = { brands: EMPTY_BRANDS, loading: true };
let snapshot: Snapshot = SERVER_SNAPSHOT;
let loadingPromise: Promise<void> | null = null;
let loadedForUserId: number | null | undefined;
let authRevision = 0;
const listeners = new Set<() => void>();

function emit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function loadFavoriteBrands() {
  if (loadingPromise) return loadingPromise;

  const revision = authRevision;
  loadingPromise = (async () => {
    try {
      const session = await getClientSession();
      if (revision !== authRevision) return;

      const userId = session?.id ?? null;
      if (loadedForUserId === userId) return;
      if (userId === null) {
        loadedForUserId = null;
        emit({ brands: EMPTY_BRANDS, loading: false });
        return;
      }

      const response = await apiFetch(`${API_URL}/api/favorite-brands`);
      if (revision !== authRevision) return;
      if (!response.ok) {
        emit({ brands: EMPTY_BRANDS, loading: false });
        return;
      }

      const data: unknown = await response.json();
      emit({
        brands: Array.isArray(data) ? (data as FavoriteBrand[]) : EMPTY_BRANDS,
        loading: false,
      });
      loadedForUserId = userId;
    } finally {
      if (revision === authRevision) {
        loadingPromise = null;
        if (snapshot.loading) emit({ ...snapshot, loading: false });
      }
    }
  })();

  return loadingPromise;
}

function invalidateFavoriteBrands() {
  authRevision += 1;
  loadedForUserId = undefined;
  loadingPromise = null;
  emit({ brands: EMPTY_BRANDS, loading: true });
  if (listeners.size > 0) void loadFavoriteBrands();
}

if (typeof window !== "undefined") {
  window.addEventListener(AUTH_EVENT, invalidateFavoriteBrands);
}

async function toggleFavoriteBrand(brand: FavoriteBrand): Promise<boolean> {
  const previous = snapshot.brands;
  const exists = previous.some((item) => item.id === brand.id);
  const next = exists
    ? previous.filter((item) => item.id !== brand.id)
    : [brand, ...previous];

  emit({ brands: next, loading: false });

  const response = await apiFetch(
    `${API_URL}/api/favorite-brands/${brand.id}`,
    { method: exists ? "DELETE" : "POST" }
  );

  if (!response.ok) {
    emit({ brands: previous, loading: false });
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось обновить избранные бренды");
  }

  return !exists;
}

export function useFavoriteBrands() {
  const current = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT
  );

  useEffect(() => {
    void loadFavoriteBrands();
  }, []);

  return {
    brands: current.brands,
    loading: current.loading,
    isFavorite: (brandId: number) =>
      current.brands.some((brand) => brand.id === brandId),
    toggle: toggleFavoriteBrand,
  };
}
