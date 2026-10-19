import { API_URL, apiFetch } from "./api";

type AuthResult = { cartId: string };

export class AuthRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly code = "") {
    super(message);
    this.name = "AuthRequestError";
  }
}

const errorMessages: Record<string, string> = {
  email_exists: "Аккаунт с такой почтой уже существует",
  invalid_email: "Проверьте адрес электронной почты",
  invalid_first_name: "Введите имя до 120 символов",
  invalid_code: "Неверный код. Проверьте письмо и попробуйте ещё раз",
  registration_expired: "Код истёк. Запросите новый код",
  password_too_short: "Пароль должен быть от 8 символов",
  password_too_long: "Пароль должен быть не длиннее 72 байт",
  registration_rate_limited: "Слишком много попыток. Попробуйте позже",
  registration_unavailable: "Регистрация временно недоступна. Попробуйте позже",
  invalid_or_expired_login_code: "Код неверен или истёк — проверьте письмо или запросите новый",
  email_login_rate_limited: "Слишком много попыток — попробуйте позже",
  email_login_unavailable: "Вход временно недоступен — попробуйте позже",
  invalid_cart_id: "Не удалось подключить корзину — обновите страницу и попробуйте ещё раз",
};

async function responseError(response: Response, fallback: string) {
  if (response.status >= 500) return new AuthRequestError(fallback, response.status);
  const body = await response.text().catch(() => "");
  let message = body;
  try {
    const parsed: unknown = JSON.parse(body);
    message = "";
    if (parsed && typeof parsed === "object") {
      const backendMessage = "message" in parsed ? parsed.message : undefined;
      const detail = "detail" in parsed ? parsed.detail : undefined;
      const title = "title" in parsed ? parsed.title : undefined;
      message = [backendMessage, detail, title]
        .find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
    }
  } catch {
    // Plain text error response.
  }
  return new AuthRequestError(errorMessages[message] ?? fallback, response.status, message);
}

async function resultOrError(response: Response, fallback: string): Promise<AuthResult> {
  if (!response.ok) {
    throw await responseError(response, fallback);
  }
  try {
    const result: unknown = await response.json();
    if (result && typeof result === "object" && "cartId" in result
      && typeof result.cartId === "string" && result.cartId.startsWith("user_") && result.cartId.length > 5) {
      return { cartId: result.cartId };
    }
  } catch { /* A malformed response must not expose JSON parser details. */ }
  throw new AuthRequestError(fallback, 502);
}

async function loginPost(path: string, body: object, fallback: string) {
  try {
    return await apiFetch(`${API_URL}/api/auth/${path}`, {
      method: "POST", body: JSON.stringify(body), signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new AuthRequestError(fallback, 0);
  }
}

export async function startEmailLogin(email: string): Promise<{ ttlSeconds: number; resendAfterSeconds: number }> {
  const fallback = "Не удалось отправить код — попробуйте ещё раз";
  const response = await loginPost("email/login/start", { email: email.trim().toLowerCase() }, fallback);
  if (!response.ok) throw await responseError(response, fallback);
  try {
    const data = await response.json();
    if (Number.isInteger(data?.ttlSeconds) && data.ttlSeconds > 0 && data.ttlSeconds <= 3600
      && Number.isInteger(data.resendAfterSeconds) && data.resendAfterSeconds > 0 && data.resendAfterSeconds <= 3600) {
      return { ttlSeconds: data.ttlSeconds, resendAfterSeconds: data.resendAfterSeconds };
    }
  } catch { /* Keep malformed transport errors out of the interface. */ }
  throw new AuthRequestError(fallback, 502);
}

export async function completeEmailLogin(email: string, code: string, cartId: string) {
  const fallback = "Не удалось завершить вход — запросите новый код и попробуйте ещё раз";
  const response = await loginPost("email/login/complete", {
    email: email.trim().toLowerCase(), code, cartId: cartId || null,
  }, fallback);
  return resultOrError(response, fallback);
}

export async function loginWithPassword(email: string, password: string, cartId: string) {
  const response = await loginPost("login", { username: email.trim(), password, cartId }, "Не удалось войти — попробуйте ещё раз");
  if (response.status === 401) throw new AuthRequestError("Неверная почта или пароль", 401);
  return resultOrError(response, "Не удалось войти. Попробуйте ещё раз");
}

export async function startEmailRegistration(email: string, password: string, firstName: string) {
  const response = await apiFetch(`${API_URL}/api/auth/email/register/start`, {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password, firstName: firstName.trim() || null }),
  });
  if (!response.ok) {
    throw await responseError(response, "Не удалось отправить код");
  }
  const result: { devCode?: string | null } = await response.json();
  return result;
}

export async function completeEmailRegistration(email: string, code: string, cartId: string) {
  const response = await apiFetch(`${API_URL}/api/auth/email/register/complete`, {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), code, cartId }),
  });
  return resultOrError(response, "Не удалось создать аккаунт");
}
