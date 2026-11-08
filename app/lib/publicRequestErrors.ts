import { ApiRequestError, readApiError } from "./apiErrors";

const MAX_RETRY_AFTER_SECONDS = 3600;

/** Retry-After is advisory UI copy; the server remains responsible for limits. */
export function retryAfterSeconds(response: Pick<Response, "headers">, now = Date.now()): number | null {
  const raw = response.headers.get("Retry-After")?.trim();
  if (!raw || raw.length > 128) return null;
  const seconds = /^\d+$/.test(raw)
    ? Number(raw)
    : Math.ceil((Date.parse(raw) - now) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.min(Math.ceil(seconds), MAX_RETRY_AFTER_SECONDS);
}

export function publicRequestErrorMessage(response: Pick<Response, "status" | "headers">, fallback: string): string {
  if (response.status !== 429 && response.status !== 503) return fallback;
  const seconds = retryAfterSeconds(response);
  const action = seconds === null ? "попробуйте позже" : `попробуйте через ${seconds} с`;
  return response.status === 429
    ? `Слишком много запросов — ${action}`
    : `Сервис временно недоступен — ${action}`;
}

/** Use only at public endpoints: monetary mutations retain their unknown-result copy. */
export async function readPublicRequestError(response: Response, fallback: string): Promise<ApiRequestError> {
  if (response.status === 429 || response.status === 503) {
    return new ApiRequestError(publicRequestErrorMessage(response, fallback), "http", response.status,
      response.status === 429 ? "PUBLIC_API_RATE_LIMITED" : "PUBLIC_API_UNAVAILABLE");
  }
  return readApiError(response, fallback);
}
