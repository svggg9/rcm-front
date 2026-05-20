import { apiFetch, API_URL } from "./api";
import type { SessionUser } from "./session";

export async function getClientSession(): Promise<SessionUser | null> {
  const response = await apiFetch(`${API_URL}/api/auth/session`);

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<SessionUser>;
}