import { apiFetch, API_URL } from "./api";

const RESET_URL = `${API_URL}/api/auth/email/password-reset`;

export type PasswordResetStartResult = {
  ttlSeconds: number;
  resendAfterSeconds: number;
};

export class PasswordResetError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "PasswordResetError";
  }
}

async function resetError(response: Response): Promise<PasswordResetError> {
  const data: unknown = await response.json().catch(() => null);
  const reason = data && typeof data === "object" && "message" in data
    ? data.message
    : undefined;

  // Never render raw server/proxy errors or infer whether the account exists.
  let message = "Не удалось выполнить запрос. Попробуйте позже.";
  if (response.status === 429) {
    message = "Слишком много попыток. Попробуйте позже: действуют лимиты на почту и IP.";
  } else if (response.status === 503) {
    message = "Восстановление временно недоступно. Попробуйте позже.";
  } else if (response.status === 403) {
    message = "Запрос отклонён. Откройте официальный сайт и попробуйте ещё раз.";
  } else if (response.status === 404 || response.status === 405) {
    message = "Восстановление пока недоступно на этом сервере. Попробуйте позже.";
  } else if (reason === "invalid_email") {
    message = "Проверьте адрес электронной почты.";
  } else if (reason === "password_too_short") {
    message = "Пароль должен содержать минимум 8 символов и не состоять только из пробелов.";
  } else if (reason === "password_too_long") {
    message = "Пароль слишком длинный: максимум 72 байта UTF-8. Сократите его.";
  } else if (reason === "invalid_or_expired_reset_code") {
    message = "Код неверен, истёк или уже использован. Проверьте последний код или запросите новый.";
  }
  return new PasswordResetError(message, response.status);
}

export function normalizeResetEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidResetEmail(value: string): boolean {
  const email = normalizeResetEmail(value);
  return email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function passwordResetValidationError(password: string, confirmation: string): string | null {
  if (password.length < 8 || !password.trim()) {
    return "Пароль должен содержать минимум 8 символов и не состоять только из пробелов.";
  }
  if (new TextEncoder().encode(password).length > 72) {
    return "Пароль слишком длинный: максимум 72 байта UTF-8. Сократите его.";
  }
  if (password !== confirmation) return "Пароли не совпадают.";
  return null;
}

export async function requestPasswordResetCode(
  email: string,
  signal?: AbortSignal,
): Promise<PasswordResetStartResult> {
  const response = await apiFetch(`${RESET_URL}/start`, {
    method: "POST",
    cache: "no-store",
    signal,
    body: JSON.stringify({ email: normalizeResetEmail(email) }),
  });
  if (response.status !== 202) throw await resetError(response);

  const data: unknown = await response.json().catch(() => null);
  const fields = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const seconds = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 3600
      ? value
      : fallback;
  return {
    ttlSeconds: seconds(fields.ttlSeconds, 600),
    resendAfterSeconds: seconds(fields.resendAfterSeconds, 60),
  };
}

export async function completePasswordReset(
  email: string,
  code: string,
  newPassword: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await apiFetch(`${RESET_URL}/complete`, {
    method: "POST",
    cache: "no-store",
    signal,
    body: JSON.stringify({ email: normalizeResetEmail(email), code: code.trim(), newPassword }),
  });
  if (response.status !== 204) throw await resetError(response);
}
