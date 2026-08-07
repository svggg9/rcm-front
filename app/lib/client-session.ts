import { apiFetch, API_URL } from "./api";
import { AUTH_EVENT } from "./authEvents";
import { clearStoredUserCartId } from "./auth";
import type { SessionUser } from "./session";

let pendingSessionRequest: Promise<SessionUser | null> | null = null;
let authRevision = 0;
let cachedSession: SessionUser | null | undefined;
let cachedAt = 0;
const SESSION_CACHE_TTL_MS = 15_000;

function invalidatePendingSessionRequest() {
  authRevision += 1;
  pendingSessionRequest = null;
  cachedSession = undefined;
  cachedAt = 0;
}

if (typeof window !== "undefined") {
  window.addEventListener(AUTH_EVENT, invalidatePendingSessionRequest);
}

async function fetchClientSession(revision: number): Promise<SessionUser | null> {
  const response = await apiFetch(`${API_URL}/api/auth/session`);

  if (response.status === 204 || !response.ok) {
    if (revision !== authRevision) return getClientSession();
    if (response.status === 204) clearStoredUserCartId();
    cachedSession = null;
    cachedAt = Date.now();
    return null;
  }

  const session = (await response.json()) as SessionUser;

  if (revision !== authRevision) return getClientSession();
  cachedSession = session;
  cachedAt = Date.now();
  return session;
}

export function getClientSession(): Promise<SessionUser | null> {
  if (
    cachedSession !== undefined &&
    Date.now() - cachedAt < SESSION_CACHE_TTL_MS
  ) {
    return Promise.resolve(cachedSession);
  }
  if (pendingSessionRequest) return pendingSessionRequest;

  const revision = authRevision;
  const request = fetchClientSession(revision).finally(() => {
    if (pendingSessionRequest === request) {
      pendingSessionRequest = null;
    }
  });

  pendingSessionRequest = request;
  return request;
}
