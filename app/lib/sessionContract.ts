import { ApiRequestError } from "./apiErrors";

export type SessionUser = { id: number; username: string; role: string | null };
export const SESSION_ERROR_MESSAGE = "Не удалось проверить вход — попробуйте ещё раз";

export function parseSessionUser(value: unknown): SessionUser {
  if (!value || typeof value !== "object") throw new ApiRequestError(SESSION_ERROR_MESSAGE, "invalid-response");
  const user = value as Record<string, unknown>;
  if (typeof user.id !== "number" || !Number.isSafeInteger(user.id) || user.id <= 0 ||
      typeof user.username !== "string" || !user.username.trim() ||
      !(user.role === null || typeof user.role === "string")) {
    throw new ApiRequestError(SESSION_ERROR_MESSAGE, "invalid-response");
  }
  return { id: user.id, username: user.username, role: user.role };
}
