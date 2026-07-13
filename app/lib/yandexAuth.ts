import { API_URL } from "./api";
import { ensureCartId } from "./auth";

export async function startYandexAuth(nextPath?: string) {
  if (typeof window === "undefined") return;

  const cartId = await ensureCartId();
  const next = nextPath ?? `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams();

  if (next.startsWith("/") && !next.startsWith("//")) {
    params.set("next", next);
  }
  if (cartId) {
    params.set("cartId", cartId);
  }

  window.location.href = `${API_URL}/api/auth/yandex/start?${params.toString()}`;
}
