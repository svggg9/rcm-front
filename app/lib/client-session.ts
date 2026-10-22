import { apiFetch, API_URL } from "./api";
import { AUTH_EVENT, SESSION_IDENTITY_EVENT } from "./authEvents";
import { clearStoredUserCartId } from "./auth";
import { ApiRequestError, toApiError } from "./apiErrors";
import { parseSessionUser, SESSION_ERROR_MESSAGE, type SessionUser } from "./sessionContract";

type SessionSnapshot = {
  user: SessionUser | null;
  hasResolved: boolean;
  loading: boolean;
  error: ApiRequestError | null;
  revision: number;
};
const SERVER_SNAPSHOT: SessionSnapshot = { user: null, hasResolved: false, loading: true, error: null, revision: 0 };
let snapshot = SERVER_SNAPSHOT;
let pendingSessionRequest: Promise<SessionUser | null> | null = null;
let controller: AbortController | null = null;
let authRevision = 0;
let cachedSession: SessionUser | null | undefined;
let cachedAt = 0;
const listeners = new Set<() => void>();
const SESSION_CACHE_TTL_MS = 15_000;

function publish(next: SessionSnapshot) { snapshot = next; listeners.forEach(listener => listener()); }
export function getClientSessionSnapshot() { return snapshot; }
export function getServerSessionSnapshot() { return SERVER_SNAPSHOT; }
export function getClientSessionRevision() { return authRevision; }

function invalidateSession() {
  authRevision++;
  controller?.abort();
  controller = null;
  pendingSessionRequest = null;
  cachedSession = undefined;
  cachedAt = 0;
  publish({ ...SERVER_SNAPSHOT, revision: authRevision });
}

function refreshOnReturn() {
  if (typeof document !== "undefined" && document.hidden) return;
  void getClientSession({ force: true }).catch(() => undefined);
}

export function subscribeClientSession(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("focus", refreshOnReturn);
    window.addEventListener("online", refreshOnReturn);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("focus", refreshOnReturn);
      window.removeEventListener("online", refreshOnReturn);
    }
  };
}

if (typeof window !== "undefined") {
  window.addEventListener(AUTH_EVENT, invalidateSession);
  window.addEventListener("storage", event => {
    if (event.key === "user_cart_id" || event.key === null) invalidateSession();
  });
}

async function fetchClientSession(revision: number, signal: AbortSignal): Promise<SessionUser | null> {
  try {
    const response = await apiFetch(`${API_URL}/api/auth/session`, { signal });
    if (revision !== authRevision) return getClientSession();
    if (response.status !== 204 && response.status !== 200) {
      throw new ApiRequestError(SESSION_ERROR_MESSAGE, "http", response.status);
    }
    const session = response.status === 204 ? null : parseSessionUser(await response.json());
    if (revision !== authRevision) return getClientSession();
    const identityChanged = cachedSession !== undefined &&
      (cachedSession?.id !== session?.id || cachedSession?.username !== session?.username);
    if (identityChanged) authRevision++;
    cachedSession = session;
    cachedAt = Date.now();
    if (session === null) {
      try { clearStoredUserCartId(); } catch { /* Storage is optional; 204 still confirms a guest. */ }
    }
    publish({ user: session, hasResolved: true, loading: false, error: null, revision: authRevision });
    if (identityChanged && typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_IDENTITY_EVENT));
    return session;
  } catch (failure) {
    if (revision !== authRevision) return getClientSession();
    // Preserve the identity for display, never return stale authority to a caller.
    cachedAt = 0;
    const error = toApiError(failure, SESSION_ERROR_MESSAGE);
    publish({ ...snapshot, loading: false, error });
    throw error;
  }
}

export function getClientSession(options: { force?: boolean } = {}): Promise<SessionUser | null> {
  if (pendingSessionRequest) return pendingSessionRequest;
  if (!options.force && cachedSession !== undefined && !snapshot.error && Date.now() - cachedAt < SESSION_CACHE_TTL_MS) {
    return Promise.resolve(cachedSession);
  }
  controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);
  const revision = authRevision;
  const request = Promise.resolve().then(() => fetchClientSession(revision, signal)).finally(() => {
    if (pendingSessionRequest === request) {
      pendingSessionRequest = null;
      controller = null;
    }
  });
  pendingSessionRequest = request;
  publish({ ...snapshot, loading: true });
  return request;
}
