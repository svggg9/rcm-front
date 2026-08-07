import { API_URL } from "./api";
import { ensureGuestCartId, getGuestCartId } from "./auth";
import { safeReturnPath } from "./safeReturnPath";

export async function startYandexAuth(nextPath?: string) {
  if (typeof window === "undefined") return;

  const cartId = getGuestCartId() || await ensureGuestCartId();
  const next = safeReturnPath(
    nextPath ?? `${window.location.pathname}${window.location.search}`
  );
  const params = new URLSearchParams();

  params.set("next", next);
  if (cartId) {
    params.set("cartId", cartId);
  }

  window.location.href = `${API_URL}/api/auth/yandex/start?${params.toString()}`;
}
