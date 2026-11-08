import { API_URL, apiFetch } from "./api";
import { ensureGuestCartId, getGuestCartId } from "./auth";
import { safeReturnPath } from "./safeReturnPath";
import { AuthRequestError } from "./authRequests";
import { ApiRequestError } from "./apiErrors";
import { readPublicRequestError } from "./publicRequestErrors";

const FAILURE_MESSAGE = "Не удалось начать вход через Яндекс — попробуйте ещё раз";

function authorizationUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["oauth.yandex.ru", "oauth.yandex.com"].includes(url.hostname)
      || url.username || url.password || url.port) return null;
    return url.href;
  } catch { return null; }
}

export async function startYandexAuth(nextPath?: string) {
  if (typeof window === "undefined") return;

  try {
    const cartId = getGuestCartId() || await ensureGuestCartId();
    const next = safeReturnPath(
      nextPath ?? `${window.location.pathname}${window.location.search}`
    );
    const params = new URLSearchParams();

    params.set("next", next);
    if (cartId) params.set("cartId", cartId);

    const response = await apiFetch(`${API_URL}/api/auth/yandex/start-url?${params.toString()}`, {
      credentials: "include", headers: { Accept: "application/json" }, cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw await readPublicRequestError(response, FAILURE_MESSAGE);
    let data: unknown;
    try { data = await response.json(); }
    catch { throw new AuthRequestError(FAILURE_MESSAGE, 502); }
    const url = data && typeof data === "object" && "authorizationUrl" in data
      ? authorizationUrl(data.authorizationUrl) : null;
    if (!url) throw new AuthRequestError(FAILURE_MESSAGE, 502);
    window.location.assign(url);
  } catch (failure) {
    if (failure instanceof AuthRequestError) throw failure;
    if (failure instanceof ApiRequestError) throw new AuthRequestError(failure.message, failure.status, failure.code);
    throw new AuthRequestError(FAILURE_MESSAGE, 0);
  }
}
