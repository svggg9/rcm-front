export const AUTH_EVENT = "auth-changed";
export const SESSION_IDENTITY_EVENT = "session-identity-changed";

export function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}
