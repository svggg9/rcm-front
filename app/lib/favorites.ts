import { apiFetch, API_URL } from "./api";
import { getToken } from "./auth";

const GUEST_FAVORITES_KEY = "guest_favorite_ids";

export function getGuestFavoriteIds(): number[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(GUEST_FAVORITES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((x): x is number => typeof x === "number");
  } catch {
    return [];
  }
}

export function setGuestFavoriteIds(ids: number[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(ids));
}

export function clearGuestFavoriteIds(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_FAVORITES_KEY);
}

export function isGuestFavorite(productId: number): boolean {
  return getGuestFavoriteIds().includes(productId);
}

export function addGuestFavorite(productId: number): number[] {
  const ids = getGuestFavoriteIds();
  if (ids.includes(productId)) return ids;

  const next = [...ids, productId];
  setGuestFavoriteIds(next);
  return next;
}

export function removeGuestFavorite(productId: number): number[] {
  const ids = getGuestFavoriteIds();
  const next = ids.filter((id) => id !== productId);
  setGuestFavoriteIds(next);
  return next;
}

export function toggleGuestFavorite(productId: number): number[] {
  const ids = getGuestFavoriteIds();

  if (ids.includes(productId)) {
    return removeGuestFavorite(productId);
  }

  return addGuestFavorite(productId);
}

/**
 * Добавить в избранное на сервере
 */
export async function addFavorite(productId: number): Promise<void> {
  const token = getToken();
  if (!token) {
    addGuestFavorite(productId);
    return;
  }

  const r = await apiFetch(`${API_URL}/api/favorites/${productId}`, {
    method: "POST",
  });

  if (!r.ok) {
    throw new Error("favorites add failed");
  }
}

/**
 * Удалить из избранного на сервере
 */
export async function removeFavorite(productId: number): Promise<void> {
  const token = getToken();
  if (!token) {
    removeGuestFavorite(productId);
    return;
  }

  const r = await apiFetch(`${API_URL}/api/favorites/${productId}`, {
    method: "DELETE",
  });

  if (!r.ok) {
    throw new Error("favorites remove failed");
  }
}

/**
 * Переключить состояние
 */
export async function toggleFavorite(
  productId: number,
  isFav: boolean
): Promise<void> {
  const token = getToken();

  if (!token) {
    toggleGuestFavorite(productId);
    return;
  }

  if (isFav) {
    return removeFavorite(productId);
  }

  return addFavorite(productId);
}

/**
 * Синхронизация guest favorites после логина
 */
export async function syncFavoritesAfterLogin(ids: number[]): Promise<void> {
  const token = getToken();
  if (!token) return;
  if (!ids.length) return;

  const uniqueIds = Array.from(new Set(ids)).filter(
    (x): x is number => typeof x === "number"
  );

  if (!uniqueIds.length) return;

  const r = await apiFetch(`${API_URL}/api/favorites/sync`, {
    method: "POST",
    body: JSON.stringify({ ids: uniqueIds }),
  });

  if (!r.ok) {
    throw new Error("favorites sync failed");
  }
}