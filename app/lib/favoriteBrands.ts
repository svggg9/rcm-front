"use client";

import { useEffect, useSyncExternalStore } from "react";

import { apiFetch, API_URL } from "./api";

export type FavoriteBrand = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
};

type Snapshot = {
  brands: FavoriteBrand[];
  loading: boolean;
};

const EMPTY_BRANDS: FavoriteBrand[] = [];
const SERVER_SNAPSHOT: Snapshot = { brands: EMPTY_BRANDS, loading: true };
let snapshot: Snapshot = SERVER_SNAPSHOT;
let loaded = false;
let loadingPromise: Promise<void> | null = null;
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
  if (loaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const response = await apiFetch(`${API_URL}/api/favorite-brands`);
      if (!response.ok) {
        emit({ brands: EMPTY_BRANDS, loading: false });
        return;
      }

      const data: unknown = await response.json();
      emit({
        brands: Array.isArray(data) ? (data as FavoriteBrand[]) : EMPTY_BRANDS,
        loading: false,
      });
    } finally {
      loaded = true;
      loadingPromise = null;
      if (snapshot.loading) emit({ ...snapshot, loading: false });
    }
  })();

  return loadingPromise;
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
