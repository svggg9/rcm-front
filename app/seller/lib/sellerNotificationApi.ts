import { apiFetch, API_URL } from "../../lib/api";
import type { TelegramStatus } from "../../lib/telegram";

export type SellerNotificationPreferences = {
  email: string | null;
  emailEnabled: boolean;
  telegramEnabled: boolean;
  telegramLinked: boolean;
  telegramUsername: string | null;
};

export type SellerNotificationDraft = {
  email: string;
  emailEnabled: boolean;
  telegramEnabled: boolean;
};

export type SellerTelegramStatus = TelegramStatus;

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  throw new Error(response.status === 401 ? "Войдите в аккаунт ещё раз"
    : response.status === 429 ? "Слишком много запросов — попробуйте позже" : fallback);
}

export function notificationDraft(preferences: SellerNotificationPreferences): SellerNotificationDraft {
  return {
    email: preferences.email ?? "",
    emailEnabled: preferences.emailEnabled,
    telegramEnabled: preferences.telegramEnabled,
  };
}

export function notificationEmailError(draft: SellerNotificationDraft): string | null {
  const email = draft.email.trim();
  if (!email) return draft.emailEnabled ? "Укажите почту для уведомлений" : null;
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? null : "Проверьте адрес электронной почты";
}

export function notificationChannelSummary(preferences: SellerNotificationPreferences): string {
  const channels: string[] = [];
  if (preferences.emailEnabled && preferences.email) channels.push("Email");
  if (preferences.telegramEnabled && preferences.telegramLinked) channels.push("Telegram");
  return channels.join(" · ") || "Каналы не выбраны";
}

export async function getSellerNotificationPreferences(): Promise<SellerNotificationPreferences> {
  return readResponse(await apiFetch(`${API_URL}/api/seller/notification-preferences`), "Не удалось загрузить каналы уведомлений");
}

export async function saveSellerNotificationPreferences(draft: SellerNotificationDraft): Promise<SellerNotificationPreferences> {
  return readResponse(await apiFetch(`${API_URL}/api/seller/notification-preferences`, {
    method: "PUT",
    body: JSON.stringify({ ...draft, email: draft.email.trim() || null }),
  }), "Не удалось сохранить каналы уведомлений");
}

export async function getSellerTelegramStatus(): Promise<SellerTelegramStatus> {
  return readResponse(await apiFetch(`${API_URL}/api/profile/telegram`), "Не удалось проверить подключение Telegram");
}

export async function createSellerTelegramLink(): Promise<SellerTelegramStatus> {
  return readResponse(await apiFetch(`${API_URL}/api/profile/telegram/link`, { method: "POST" }), "Не удалось создать ссылку Telegram");
}

export async function unlinkSellerTelegram(): Promise<SellerTelegramStatus> {
  return readResponse(await apiFetch(`${API_URL}/api/profile/telegram`, { method: "DELETE" }), "Не удалось отвязать Telegram");
}
