import { cookies } from "next/headers";

import { API_URL } from "./config";
import { ApiRequestError, toApiError } from "./apiErrors";
import { parseSessionUser, SESSION_ERROR_MESSAGE, type SessionUser } from "./sessionContract";
export type { SessionUser } from "./sessionContract";

export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();

  try {
    const response = await fetch(`${API_URL}/api/auth/session`, {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 204) return null;
    if (response.status !== 200) throw new ApiRequestError(SESSION_ERROR_MESSAGE, "http", response.status);
    return parseSessionUser(await response.json());
  } catch (failure) { throw toApiError(failure, SESSION_ERROR_MESSAGE); }
}
