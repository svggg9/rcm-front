import { API_URL, apiFetch } from "./api";

type AuthResult = { cartId: string };

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
};

async function responseError(response: Response, fallback: string) {
  if (response.status >= 500) return new Error(fallback);
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
  return new Error(errorMessages[message] ?? (message && !message.startsWith("{") ? message : fallback));
}

async function resultOrError(response: Response, fallback: string): Promise<AuthResult> {
  if (!response.ok) {
    throw await responseError(response, fallback);
  }
  return response.json() as Promise<AuthResult>;
}

export async function loginWithPassword(email: string, password: string, cartId: string) {
  const response = await apiFetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username: email.trim(), password, cartId }),
  });
  if (response.status === 401) throw new Error("Неверная почта или пароль");
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
