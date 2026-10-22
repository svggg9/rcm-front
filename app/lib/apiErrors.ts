export type ApiErrorKind = "http" | "network" | "timeout" | "invalid-response";

/** Only locally defined messages belong here, never a raw server body. */
export class ApiRequestError extends Error {
  constructor(message: string, public readonly kind: ApiErrorKind, public readonly status = 0, public readonly code = "") {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function isRequestCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Feature dictionaries keep business rules out of the transport layer. */
export async function readApiError(response: Response, fallback: string, messages: Readonly<Record<string, string>> = {}): Promise<ApiRequestError> {
  let code = "";
  let knownMessage: string | undefined;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object") {
      for (const key of ["code", "message"] as const) {
        const value = key in body ? (body as Record<string, unknown>)[key] : undefined;
        if (typeof value !== "string") continue;
        if (!code) code = value;
        if (Object.hasOwn(messages, value)) {
          code = value;
          knownMessage = messages[value];
          break;
        }
      }
    }
  } catch (error) {
    if (isRequestCancelled(error) || (error instanceof Error && error.name === "TimeoutError")) throw error;
    // HTML, text and malformed JSON are replaced with local copy.
  }
  const message = knownMessage ?? (
    response.status === 401 ? "Войдите в аккаунт ещё раз" :
    response.status === 429 ? "Слишком много запросов — попробуйте позже" : fallback
  );
  return new ApiRequestError(message, "http", response.status, code);
}

export function toApiError(error: unknown, fallback: string): ApiRequestError {
  if (error instanceof ApiRequestError) return error;
  if (error instanceof Error && error.name === "TimeoutError") {
    return new ApiRequestError("Сервер не ответил — попробуйте ещё раз", "timeout");
  }
  return new ApiRequestError(fallback, "network");
}
