"use client";

import { useEffect, useSyncExternalStore } from "react";

import { apiFetch, API_URL } from "./api";
import { ApiRequestError, isRequestCancelled, readApiError, toApiError } from "./apiErrors";
import { AUTH_EVENT, SESSION_IDENTITY_EVENT } from "./authEvents";
import { getClientSession } from "./client-session";

export type FavoriteBrand = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
  images?: { id: number; imageUrl: string; sortOrder: number }[];
};

type Snapshot = {
  brands: FavoriteBrand[];
  loading: boolean;
  hasLoaded: boolean;
  error: ApiRequestError | null;
  pendingIds: readonly number[];
};

const LOAD_ERROR = "Не удалось загрузить сохранённые бренды";
const SAVE_ERROR = "Не удалось обновить сохранённые бренды — попробуйте ещё раз";
const EMPTY_BRANDS: FavoriteBrand[] = [];
const SERVER_SNAPSHOT: Snapshot = { brands: EMPTY_BRANDS, loading: true, hasLoaded: false, error: null, pendingIds: [] };
let snapshot: Snapshot = SERVER_SNAPSHOT;
let loadingPromise: Promise<void> | null = null;
let loadedForUserId: number | null | undefined;
let snapshotForUserId: number | null | undefined;
let authRevision = 0;
let loadController: AbortController | null = null;
const mutations = new Map<number, AbortController>();
const listeners = new Set<() => void>();

function emit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // Other screens can share this store; StrictMode can resubscribe immediately.
    queueMicrotask(() => {
      if (listeners.size > 0) return;
      loadController?.abort();
      mutations.forEach(controller => controller.abort());
    });
  };
}

function isBrand(value: unknown): value is FavoriteBrand {
  if (!value || typeof value !== "object") return false;
  const brand = value as Partial<FavoriteBrand>;
  return Number.isSafeInteger(brand.id) && Number(brand.id) > 0
    && typeof brand.name === "string" && brand.name.trim().length > 0
    && typeof brand.slug === "string" && brand.slug.length > 0
    && (brand.logoUrl === null || typeof brand.logoUrl === "string")
    && (brand.country === null || typeof brand.country === "string")
    && (brand.images === undefined || (Array.isArray(brand.images) && brand.images.every(image =>
      image && Number.isSafeInteger(image.id) && typeof image.imageUrl === "string" && Number.isFinite(image.sortOrder))));
}

async function loadFavoriteBrands(force = false) {
  if (loadingPromise) return loadingPromise;
  // Do not replace optimistic updates with an older GET response.
  if (mutations.size > 0) return;
  const revision = authRevision;
  const controller = new AbortController();
  loadController = controller;
  const request = (async () => {
    try {
      const session = await getClientSession();
      if (revision !== authRevision || controller.signal.aborted) return;
      const userId = session?.id ?? null;
      if (snapshotForUserId !== userId) {
        snapshotForUserId = userId;
        emit({ ...SERVER_SNAPSHOT });
      }
      if (!force && loadedForUserId === userId) return;
      if (userId === null) {
        loadedForUserId = null;
        emit({ ...snapshot, brands: EMPTY_BRANDS, loading: false, hasLoaded: true, error: null });
        return;
      }
      emit({ ...snapshot, loading: true });
      const response = await apiFetch(`${API_URL}/api/favorite-brands`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
      });
      if (!response.ok) throw await readApiError(response, LOAD_ERROR);
      let data: unknown;
      try {
        data = await response.json();
      } catch (error) {
        if (isRequestCancelled(error) || (error instanceof Error && error.name === "TimeoutError")) throw error;
        throw new ApiRequestError(LOAD_ERROR, "invalid-response", response.status);
      }
      if (!Array.isArray(data) || !data.every(isBrand) || new Set(data.map(brand => brand.id)).size !== data.length) {
        throw new ApiRequestError(LOAD_ERROR, "invalid-response", response.status);
      }
      // Body parsing is asynchronous too: do not restore the previous user.
      if (revision !== authRevision || controller.signal.aborted) return;
      loadedForUserId = userId;
      emit({ ...snapshot, brands: data, loading: false, hasLoaded: true, error: null });
    } catch (error) {
      if (revision !== authRevision) return;
      if (controller.signal.aborted || isRequestCancelled(error)) {
        if (snapshot.hasLoaded) emit({ ...snapshot, loading: false });
        return;
      }
      emit({ ...snapshot, loading: false, error: toApiError(error, LOAD_ERROR) });
    }
  })();
  loadingPromise = request;
  try {
    await request;
  } finally {
    if (loadingPromise === request) {
      loadingPromise = null;
      loadController = null;
    }
  }
}

function invalidateFavoriteBrands() {
  authRevision += 1;
  loadController?.abort();
  mutations.forEach(controller => controller.abort());
  mutations.clear();
  loadedForUserId = undefined;
  snapshotForUserId = undefined;
  loadingPromise = null;
  emit({ ...SERVER_SNAPSHOT });
  if (listeners.size > 0) void loadFavoriteBrands();
}

if (typeof window !== "undefined") {
  window.addEventListener(AUTH_EVENT, invalidateFavoriteBrands);
  window.addEventListener(SESSION_IDENTITY_EVENT, invalidateFavoriteBrands);
}

async function toggleFavoriteBrand(brand: FavoriteBrand): Promise<boolean | undefined> {
  if (mutations.has(brand.id) || snapshot.loading || snapshot.error || !snapshot.hasLoaded) return;
  const previous = snapshot.brands;
  const revision = authRevision;
  const exists = previous.some(item => item.id === brand.id);
  const controller = new AbortController();
  mutations.set(brand.id, controller);
  emit({ ...snapshot, brands: exists ? previous.filter(item => item.id !== brand.id) : [brand, ...previous], pendingIds: [...mutations.keys()] });
  try {
    const response = await apiFetch(`${API_URL}/api/favorite-brands/${brand.id}`, {
      method: exists ? "DELETE" : "POST",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
    });
    if (!response.ok) throw await readApiError(response, SAVE_ERROR, { "Brand not found": "Бренд больше недоступен" });
    if (revision !== authRevision) return;
    if (controller.signal.aborted) {
      loadedForUserId = undefined;
      return;
    }
    return !exists;
  } catch (error) {
    if (revision !== authRevision) return;
    loadedForUserId = undefined;
    const restored = snapshot.brands.filter(item => item.id !== brand.id);
    const index = previous.findIndex(item => item.id === brand.id);
    if (index >= 0) restored.splice(Math.min(index, restored.length), 0, previous[index]);
    emit({ ...snapshot, brands: restored });
    if (controller.signal.aborted || isRequestCancelled(error)) return;
    throw toApiError(error, SAVE_ERROR);
  } finally {
    if (revision === authRevision) {
      mutations.delete(brand.id);
      emit({ ...snapshot, pendingIds: [...mutations.keys()] });
    }
  }
}

export function useFavoriteBrands() {
  const current = useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
  useEffect(() => { void loadFavoriteBrands(); }, []);
  return {
    ...current,
    reload: () => loadFavoriteBrands(true),
    isFavorite: (brandId: number) => current.brands.some(item => item.id === brandId),
    toggle: toggleFavoriteBrand,
  };
}
