import { apiFetch, API_URL } from "./api";
import { getToken } from "./auth";

/**
 * Добавить в избранное
 */
export async function addFavorite(productId: number): Promise<void> {
  const token = getToken();
  if (!token) {
    // если не авторизован — просто ничего не делаем
    // редирект на логин можно делать на уровне UI
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
 * Удалить из избранного
 */
export async function removeFavorite(productId: number): Promise<void> {
  const token = getToken();
  if (!token) return;

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
  if (isFav) {
    return removeFavorite(productId);
  }
  return addFavorite(productId);
}

/**
 * Синхронизация после логина (если нужна)
 */
export async function syncFavoritesAfterLogin(ids: number[]): Promise<void> {
  const token = getToken();
  if (!token) return;

  const r = await apiFetch(`${API_URL}/api/favorites/sync`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });

  if (!r.ok) {
    throw new Error("favorites sync failed");
  }
}