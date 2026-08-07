import { apiFetch, API_URL } from "./api";
import { getClientSession } from "./client-session";

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

async function hasSession(): Promise<boolean> {
  return (await getClientSession()) !== null;
}

export async function addFavorite(productId: number): Promise<void> {
  const authenticated = await hasSession();

  if (!authenticated) {
    addGuestFavorite(productId);
    return;
  }

  const response = await apiFetch(`${API_URL}/api/favorites/${productId}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("favorites add failed");
  }
}

export async function removeFavorite(productId: number): Promise<void> {
  const authenticated = await hasSession();

  if (!authenticated) {
    removeGuestFavorite(productId);
    return;
  }

  const response = await apiFetch(`${API_URL}/api/favorites/${productId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("favorites remove failed");
  }
}

export async function toggleFavorite(
  productId: number,
  isFav: boolean
): Promise<void> {
  const authenticated = await hasSession();

  if (!authenticated) {
    toggleGuestFavorite(productId);
    return;
  }

  if (isFav) {
    return removeFavorite(productId);
  }

  return addFavorite(productId);
}

export async function syncFavoritesAfterLogin(ids: number[]): Promise<boolean> {
  if (!ids.length) return true;

  const authenticated = await hasSession();

  if (!authenticated) return false;

  const uniqueIds = Array.from(new Set(ids)).filter(
    (x): x is number => typeof x === "number"
  );

  if (!uniqueIds.length) return true;

  try {
    const response = await apiFetch(`${API_URL}/api/favorites/sync`, {
      method: "POST",
      body: JSON.stringify({ ids: uniqueIds }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
