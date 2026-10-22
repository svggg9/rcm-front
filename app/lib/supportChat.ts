import { API_URL, apiFetch } from "./api";
import { ApiRequestError, readApiError, toApiError } from "./apiErrors";

export type SupportChatStatus = "NEW" | "IN_PROGRESS" | "CLOSED";
export type SupportChat = { id: number; name: string; telegramUsername: string | null; status: SupportChatStatus; createdAt: string; updatedAt: string; lastMessage: string | null };
export type SupportMessage = { id: number; direction: "CUSTOMER" | "SUPPORT"; body: string; authorName: string | null; createdAt: string; legacyDeliveryStatus: string | null };
export type SupportHistory = { chat: SupportChat; messages: SupportMessage[]; nextBeforeId: number | null };
export type SupportChatPage = { content: SupportChat[]; number: number; totalPages: number; totalElements: number };
export type SupportDraft = { body: string; pending: { body: string; requestId: string } | null };
export type SupportTransport = {
  history: (beforeId: number | null, signal: AbortSignal) => Promise<SupportHistory>;
  send: (body: string, requestId: string, signal: AbortSignal) => Promise<SupportMessage>;
  updateStatus?: (status: SupportChatStatus, signal: AbortSignal) => Promise<SupportChat>;
};
export const SUPPORT_STATUSES: Record<SupportChatStatus, string> = { NEW: "Новое", IN_PROGRESS: "В работе", CLOSED: "Закрыто" };
export const SUPPORT_ACCESS_KEY = "rcm-support-access-v1";
export const SUPPORT_ACCESS_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object"; }
function chat(value: unknown): value is SupportChat {
  return record(value) && Number.isSafeInteger(value.id) && typeof value.name === "string" && typeof value.status === "string" && Object.hasOwn(SUPPORT_STATUSES, value.status)
    && typeof value.createdAt === "string" && typeof value.updatedAt === "string";
}
function message(value: unknown): value is SupportMessage {
  return record(value) && Number.isSafeInteger(value.id) && (value.direction === "CUSTOMER" || value.direction === "SUPPORT") && typeof value.body === "string" && typeof value.createdAt === "string";
}
function invalid(): never { throw new ApiRequestError("Не удалось прочитать диалог — обновите сообщения", "invalid-response"); }
async function data(response: Response): Promise<unknown> { try { return await response.json(); } catch { return invalid(); } }

async function request(path: string, options: RequestInit, access?: string): Promise<Response> {
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000);
  try {
    // Capability requests never participate in account sessions or send browser credentials.
    const response = access ? await fetch(`${API_URL}/api/support/chat${path}`, {
      ...options, signal, credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer",
      headers: { "X-Support-Access": access, ...(options.body ? { "Content-Type": "application/json" } : {}) },
    }) : await apiFetch(`${API_URL}/api/admin/support/chats${path}`, { ...options, signal, cache: "no-store" });
    if (!response.ok) {
      if (access && (response.status === 401 || response.status === 403)) throw new ApiRequestError("Ссылка недействительна или срок её действия закончился", "http", response.status);
      throw await readApiError(response, response.status === 409 ? "Не удалось подтвердить прежнюю отправку — обновите историю перед продолжением"
        : options.method === "POST" ? "Результат отправки неизвестен — повторите тот же запрос, когда связь восстановится" : "Не удалось загрузить диалог — попробуйте ещё раз");
    }
    return response;
  } catch (reason) {
    if (options.signal?.aborted) throw reason;
    throw toApiError(reason, "Не удалось связаться с сервером — попробуйте ещё раз");
  }
}
async function history(path: string, beforeId: number | null, signal: AbortSignal, access?: string): Promise<SupportHistory> {
  const result = await data(await request(`${path}/messages${beforeId ? `?beforeId=${beforeId}` : ""}`, { signal }, access));
  if (!record(result) || !chat(result.chat) || !Array.isArray(result.messages) || !result.messages.every(message)
    || !(result.nextBeforeId === null || Number.isSafeInteger(result.nextBeforeId))) return invalid();
  return result as SupportHistory;
}
async function send(path: string, body: string, requestId: string, signal: AbortSignal, access?: string): Promise<SupportMessage> {
  const result = await data(await request(`${path}/messages`, { method: "POST", body: JSON.stringify({ body, requestId }), signal }, access));
  if (!message(result)) return invalid();
  return result;
}
export function publicSupportTransport(access: string): SupportTransport {
  if (!SUPPORT_ACCESS_PATTERN.test(access)) throw new ApiRequestError("Откройте персональную ссылку из Telegram-бота", "http", 401);
  return { history: (before, signal) => history("", before, signal, access), send: (body, requestId, signal) => {
    // Retry persistence if storage was unavailable when the fragment was first opened.
    try { sessionStorage.setItem(SUPPORT_ACCESS_KEY, access); }
    catch { throw new ApiRequestError("Не удалось сохранить доступ вкладки — разрешите sessionStorage перед отправкой", "invalid-response"); }
    return send("", body, requestId, signal, access);
  } };
}
export function adminSupportTransport(id: number): SupportTransport {
  return {
    history: (before, signal) => history(`/${id}`, before, signal),
    send: (body, requestId, signal) => send(`/${id}`, body, requestId, signal),
    async updateStatus(status, signal) {
      const result = await data(await request(`/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), signal }));
      if (!chat(result)) return invalid();
      return result;
    },
  };
}
export async function getSupportChats(status: SupportChatStatus | "ALL", page: number, signal: AbortSignal): Promise<SupportChatPage> {
  const query = new URLSearchParams({ page: String(page), size: "20" }); if (status !== "ALL") query.set("status", status);
  const result = await data(await request(`?${query}`, { signal }));
  if (!record(result) || !Array.isArray(result.content) || !result.content.every(chat) || !Number.isSafeInteger(result.totalPages) || !Number.isSafeInteger(result.totalElements)) return invalid();
  return result as SupportChatPage;
}
export function mergeSupportMessages(previous: SupportMessage[], incoming: SupportMessage[]): SupportMessage[] {
  const messages = new Map(previous.map(row => [row.id, row])); incoming.forEach(row => messages.set(row.id, row));
  return [...messages.values()].sort((first, second) => first.createdAt.localeCompare(second.createdAt) || first.id - second.id);
}
export function readSupportDraft(key: string): SupportDraft {
  const raw: unknown = JSON.parse(sessionStorage.getItem(key) || "null");
  if (!record(raw)) return { body: "", pending: null };
  const body = typeof raw.body === "string" ? raw.body.slice(0, 4000) : "";
  const pending = record(raw.pending) && typeof raw.pending.body === "string" && raw.pending.body.length <= 4000 && typeof raw.pending.requestId === "string" && uuid.test(raw.pending.requestId)
    ? { body: raw.pending.body, requestId: raw.pending.requestId } : null;
  return { body, pending };
}
