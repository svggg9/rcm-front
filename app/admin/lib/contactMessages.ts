import { API_URL } from "../../lib/api";
import { readApiError, readApiJson } from "../../lib/apiErrors";
import { requestApiResponse } from "../../lib/apiRequest";
import type { ContactTopic } from "../../lib/contactMessages";
import type { PageResponse } from "../types";

export type ContactMessageStatus = "NEW" | "IN_PROGRESS" | "CLOSED";

export type ContactMessage = {
  id: number;
  name: string;
  email: string | null;
  channel?: "EMAIL" | "TELEGRAM";
  telegramUsername?: string | null;
  topic: ContactTopic;
  message: string;
  orderNumber?: string | null;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
};

export type ContactReplyStatus = "PENDING" | "SENDING" | "SENT" | "FAILED" | "UNKNOWN";

export type ContactReply = {
  id: number;
  contactMessageId: number;
  body: string;
  recipientEmail: string | null;
  channel?: "EMAIL" | "TELEGRAM";
  recipientChatId?: string | null;
  deliveryMessageId?: number | null;
  authorId: number;
  authorName: string;
  status: ContactReplyStatus;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  attempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  canRetry: boolean;
};

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw await readApiError(response, "Для работы с обращениями войдите в аккаунт администратора");
    }
    throw await readApiError(response, fallback);
  }
  return readApiJson<T>(response, "Не удалось прочитать обращение — обновите данные перед продолжением");
}

export async function getContactMessages(
  status: ContactMessageStatus | "ALL",
  page: number,
  signal: AbortSignal,
  q = "",
): Promise<PageResponse<ContactMessage>> {
  const query = new URLSearchParams({ page: String(page), size: "20", channel: "EMAIL", q });
  if (status !== "ALL") query.set("status", status);
  const response = await requestApiResponse(`${API_URL}/api/admin/contact-messages?${query}`, {
    signal,
    cache: "no-store",
  }, "Не удалось загрузить обращения — попробуйте ещё раз");
  return readResponse(response, "Не удалось загрузить обращения — попробуйте ещё раз");
}

export async function updateContactMessageStatus(
  id: number,
  status: ContactMessageStatus,
  signal: AbortSignal,
): Promise<ContactMessage> {
  const response = await requestApiResponse(`${API_URL}/api/admin/contact-messages/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    signal,
  }, "Не удалось получить результат изменения — обновите обращение перед повтором");
  return readResponse(response, "Не удалось изменить статус обращения — попробуйте ещё раз");
}

async function readReplyResponse<T>(response: Response, fallback: string): Promise<T> {
  if (response.ok) return readApiJson<T>(response, "Не удалось прочитать ответ — обновите историю перед повтором");
  if (response.status === 401 || response.status === 403) {
    throw await readApiError(response, "Для ответа войдите в аккаунт администратора");
  }
  if (response.status === 409) {
    throw await readApiError(response, "Этот запрос уже обработан или повтор недоступен — обновите историю ответов");
  }
  if (response.status === 400) {
    throw await readApiError(response, "Проверьте текст ответа и доступность канала");
  }
  throw await readApiError(response, fallback);
}

export async function getContactReplies(id: number, signal: AbortSignal): Promise<ContactReply[]> {
  const response = await requestApiResponse(`${API_URL}/api/admin/contact-messages/${id}/replies`, {
    signal,
    cache: "no-store",
  }, "Не удалось загрузить ответы — попробуйте ещё раз");
  return readReplyResponse(response, "Не удалось загрузить ответы");
}

export async function createContactReply(
  id: number,
  body: string,
  requestId: string,
  signal: AbortSignal,
): Promise<ContactReply> {
  const response = await requestApiResponse(`${API_URL}/api/admin/contact-messages/${id}/replies`, {
    method: "POST",
    body: JSON.stringify({ body, requestId }),
    signal,
  }, "Не удалось получить результат отправки — проверьте историю перед повтором");
  return readReplyResponse(response, "Не удалось получить результат отправки — проверьте историю перед повтором");
}

export async function retryContactReply(
  id: number,
  replyId: number,
  requestId: string,
  signal: AbortSignal,
): Promise<ContactReply> {
  const response = await requestApiResponse(`${API_URL}/api/admin/contact-messages/${id}/replies/${replyId}/retry`, {
    method: "POST",
    body: JSON.stringify({ requestId }),
    signal,
  }, "Не удалось получить результат повтора — проверьте историю ответов");
  return readReplyResponse(response, "Не удалось получить результат повтора — проверьте историю ответов");
}
