import { apiFetch, API_URL } from "./api";

type Action = "start" | "confirm-current" | "new/start" | "complete";
export type EmailChangeResult = { changeToken?: string; email?: string; emailVerified?: boolean; resendAfterSeconds?: number };

export async function changeEmail(action: Action, body: Record<string, string> = {}): Promise<EmailChangeResult> {
  let response: Response;
  try {
    response = await apiFetch(`${API_URL}/api/profile/email-change/${action}`, {
      method: "POST", cache: "no-store", body: JSON.stringify(body),
    });
  } catch {
    throw new Error(action === "complete" ? "Не удалось получить ответ — обновите профиль, чтобы проверить смену почты" : "Нет связи с сервером — попробуйте ещё раз");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const messages: Record<string, string> = {
      invalid_email: "Проверьте адрес электронной почты",
      same_email: "Укажите другую почту",
      email_unavailable: "Эта почта недоступна для смены адреса",
      current_email_required: "Для смены почты обратитесь в поддержку",
      invalid_or_expired_change_code: "Код неверен или истёк — проверьте письмо или начните смену почты заново",
    };
    const fallback = response.status === 429 ? "Слишком много попыток — попробуйте позже" :
      response.status === 401 || response.status === 403 ? "Войдите в аккаунт заново — если почта уже изменена, используйте новый адрес" : "Не удалось сменить почту — попробуйте ещё раз";
    throw new Error(messages[data?.message] ?? fallback);
  }
  return data ?? {};
}
