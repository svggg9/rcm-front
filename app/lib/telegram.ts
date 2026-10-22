import { API_URL, apiFetch } from "./api";

export type TelegramConnectionStatus = "UNLINKED" | "PENDING" | "LINKED" | "RELINK_PENDING" | "EXPIRED";
export type TelegramStatus = {
  url: string | null;
  expiresAt: string | null;
  linked: boolean;
  telegramUsername: string | null;
  status?: TelegramConnectionStatus;
  botUsername?: string | null;
  linkEnvironment?: string | null;
  deliveryStatus?: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  lastDeliveredAt?: string | null;
  lastDeliveryErrorCode?: string | null;
};

export function telegramUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "t.me" && !url.username && !url.password && !url.port
      ? url.toString() : null;
  } catch { return null; }
}

export function telegramLinkPending(status: TelegramStatus | null, now = Date.now()): boolean {
  return Boolean(status && telegramUrl(status.url) && status.expiresAt && Date.parse(status.expiresAt) > now
    && status.status !== "EXPIRED" && status.status !== "UNLINKED" && status.status !== "LINKED");
}

/** A legacy status response may omit the pending URL. Keep the live link until its deadline. */
export function mergeTelegramStatus(current: TelegramStatus | null, next: TelegramStatus, now = Date.now()): TelegramStatus {
  const canKeepLink = !next.status && !next.url && next.linked === current?.linked && telegramLinkPending(current, now);
  const expiredLegacy = current?.status === "EXPIRED" && !next.status && !next.linked && !next.url;
  const merged = canKeepLink ? { ...next, url: current!.url, expiresAt: current!.expiresAt }
    : expiredLegacy ? { ...next, status: "EXPIRED" as const } : next;
  return { ...merged, url: telegramUrl(merged.url) };
}

async function requestTelegram(method: "GET" | "POST" | "DELETE", signal: AbortSignal): Promise<TelegramStatus> {
  const fallback = method === "GET" ? "Не удалось проверить подключение Telegram"
    : method === "POST" ? "Не удалось создать ссылку подключения" : "Не удалось отвязать Telegram";
  try {
    const response = await apiFetch(`${API_URL}/api/profile/telegram${method === "POST" ? "/link" : ""}`, {
      method, signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), cache: "no-store",
    });
    if (!response.ok) throw new TelegramRequestError(response.status === 401 ? "Войдите в аккаунт ещё раз"
      : response.status === 429 ? "Слишком много запросов — попробуйте позже" : fallback);
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || typeof (result as TelegramStatus).linked !== "boolean") {
      throw new TelegramRequestError(fallback);
    }
    return result as TelegramStatus;
  } catch (error) {
    if (signal.aborted) throw error;
    if (error instanceof TelegramRequestError) throw error;
    throw new TelegramRequestError(error instanceof Error && error.name === "TimeoutError" ? "Сервер не ответил — попробуйте ещё раз" : fallback);
  }
}

class TelegramRequestError extends Error {}

export const getTelegramStatus = (signal: AbortSignal) => requestTelegram("GET", signal);
export const createTelegramLink = (signal: AbortSignal) => requestTelegram("POST", signal);
export const unlinkTelegram = (signal: AbortSignal) => requestTelegram("DELETE", signal);
