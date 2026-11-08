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

const responseSignals = new WeakMap<Response, { signal: AbortSignal; unknownResultMessage?: string }>();

/** Keep body-read cancellation tied to the same bounded request, without changing Response. */
export function trackApiResponse(response: Response, signal: AbortSignal, unknownResultMessage?: string): Response {
  responseSignals.set(response, { signal, unknownResultMessage });
  return response;
}

function responseReadError(response: Response, error: unknown, fallback: string): never {
  const context = responseSignals.get(response);
  const signal = context?.signal;
  const unknownResultMessage = response.ok || response.status >= 500 ? context?.unknownResultMessage : undefined;
  const reason: unknown = signal?.aborted ? signal.reason : error;
  if (reason instanceof Error && reason.name === "TimeoutError") {
    if (unknownResultMessage) throw new ApiRequestError(unknownResultMessage, "timeout", response.status);
    throw toApiError(reason, fallback);
  }
  if (isRequestCancelled(reason)) throw reason;
  if (isRequestCancelled(error)) throw error;
  throw new ApiRequestError(unknownResultMessage ?? fallback, "invalid-response", response.status);
}

/** Decode transport JSON; feature-specific payload validation still belongs to its consumer. */
export async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  try {
    return await response.json() as T;
  } catch (error) {
    return responseReadError(response, error, fallback);
  }
}

export async function readApiBlob(response: Response, fallback: string): Promise<Blob> {
  try {
    return await response.blob();
  } catch (error) {
    return responseReadError(response, error, fallback);
  }
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
    const signal = responseSignals.get(response)?.signal;
    if (signal?.aborted) responseReadError(response, error, fallback);
    if (isRequestCancelled(error) || (error instanceof Error && error.name === "TimeoutError")) throw error;
    // HTML, text and malformed JSON are replaced with local copy.
  }
  const message = knownMessage ?? (
    response.status === 401 ? "Войдите в аккаунт ещё раз" :
    response.status === 403 ? "Недостаточно прав для этого действия" :
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
