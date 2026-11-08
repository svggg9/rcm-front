import { apiFetch } from "./api";
import { ApiRequestError, isRequestCancelled, toApiError, trackApiResponse } from "./apiErrors";

function requestSignal(caller: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!caller) return timeout;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([caller, timeout]);

  // Retain cancellation on browsers without AbortSignal.any. The timeout also
  // covers a response body that stalls after the headers have arrived.
  const combined = new AbortController();
  const detach = () => {
    caller.removeEventListener("abort", onCaller);
    timeout.removeEventListener("abort", onTimeout);
  };
  const forward = (source: AbortSignal) => { combined.abort(source.reason); detach(); };
  const onCaller = () => forward(caller);
  const onTimeout = () => forward(timeout);
  if (caller.aborted) forward(caller);
  else {
    caller.addEventListener("abort", onCaller, { once: true });
    timeout.addEventListener("abort", onTimeout, { once: true });
  }
  return combined.signal;
}

/** One request, never a mutation retry. Messages are local UI copy only. */
export async function requestApiResponse(
  url: string,
  options: RequestInit,
  fallback: string,
  timeoutMs = 20_000,
): Promise<Response> {
  const signal = requestSignal(options.signal, timeoutMs);
  const mutation = !["GET", "HEAD"].includes((options.method ?? "GET").toUpperCase());
  const failure = (error: unknown) => {
    const normalized = toApiError(error, fallback);
    return mutation && normalized.kind === "timeout"
      ? new ApiRequestError(fallback, "timeout", normalized.status, normalized.code) : normalized;
  };
  try {
    if (signal.aborted) throw signal.reason;
    return trackApiResponse(await apiFetch(url, { ...options, signal }), signal, mutation ? fallback : undefined);
  } catch (error) {
    if (signal.aborted && signal.reason instanceof Error && signal.reason.name === "TimeoutError") {
      throw failure(signal.reason);
    }
    if (options.signal?.aborted) {
      if (isRequestCancelled(error)) throw error;
      throw new DOMException("Запрос отменён", "AbortError");
    }
    if (isRequestCancelled(error)) throw error;
    throw failure(error);
  }
}
