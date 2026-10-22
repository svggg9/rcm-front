import { apiFetch, API_URL } from "../../lib/api";
import { ApiRequestError, readApiError, toApiError } from "../../lib/apiErrors";
import type { SellerLegalInfo } from "./sellerLegalApi";

export type LegalChangeRequest = {
  id: number; changes: string; reason: string; createdAt: string;
  reopenedAt: string | null; resolution: string | null;
};
export type SellerLegalReview = { verified: boolean; verifiedAt: string | null; changeRequest: LegalChangeRequest | null };
export type AdminLegalReview = { info: SellerLegalInfo | null; review: SellerLegalReview };
export type LegalRequestQueue = { content: { sellerId: number; sellerName: string; changeRequest: LegalChangeRequest }[]; totalPages: number; number: number; totalElements: number };
const messages: Record<string, string> = {
  LEGAL_VERIFIED_LOCKED: "Реквизиты уже подтверждены — отправьте запрос на изменение в поддержку",
  LEGAL_NOT_VERIFIED: "Редактирование реквизитов уже доступно — обновите страницу",
  LEGAL_REQUEST_PENDING: "Запрос уже рассматривается — обновите статус",
  LEGAL_REQUEST_CONFLICT: "Этот запрос уже отправлен с другими данными — обновите статус",
  LEGAL_REVIEW_STALE: "Данные изменились — обновите их и проверьте ещё раз",
  LEGAL_INCOMPLETE: "Для подтверждения заполните юридические и банковские реквизиты и примите оферту",
  LEGAL_NOTE_REQUIRED: "Добавьте ответ продавцу",
};
function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object"); }
function review(value: unknown): value is SellerLegalReview {
  if (!record(value) || typeof value.verified !== "boolean" || !(value.verifiedAt === null || typeof value.verifiedAt === "string")) return false;
  if (value.verified !== (value.verifiedAt !== null)) return false;
  const item = value.changeRequest;
  return item === null || (record(item) && Number.isSafeInteger(item.id) && typeof item.changes === "string" && typeof item.reason === "string"
    && typeof item.createdAt === "string" && (item.reopenedAt === null || typeof item.reopenedAt === "string") && (item.resolution === null || typeof item.resolution === "string"));
}
async function request(path: string, method = "GET", payload?: unknown): Promise<unknown> {
  try {
    const response = await apiFetch(`${API_URL}${path}`, { method, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw await readApiError(response, method === "GET" ? "Не удалось загрузить статус реквизитов" : "Не удалось выполнить действие — попробуйте ещё раз", messages);
    try { return await response.json(); } catch { throw new ApiRequestError("Не удалось прочитать результат — обновите статус перед повтором", "invalid-response"); }
  } catch (error) { throw toApiError(error, method === "GET" ? "Не удалось загрузить статус реквизитов — проверьте соединение" : "Результат отправки неизвестен — повторите тот же запрос"); }
}
export async function getSellerLegalReview(): Promise<SellerLegalReview> {
  const value = await request("/api/seller/legal-info/review");
  if (!review(value)) throw new ApiRequestError("Не удалось прочитать статус реквизитов", "invalid-response");
  return value;
}
export async function requestLegalChange(payload: { requestId: string; changes: string; reason: string }): Promise<SellerLegalReview> {
  const value = await request("/api/seller/legal-info/change-requests", "POST", payload);
  if (!review(value)) throw new ApiRequestError("Обновите статус запроса перед повтором", "invalid-response");
  return value;
}
export async function getAdminLegalReview(sellerId: number): Promise<AdminLegalReview> {
  return adminResult(await request(`/api/admin/sellers/${sellerId}/legal-review`));
}
function adminResult(value: unknown): AdminLegalReview {
  if (!record(value) || !review(value.review) || !(value.info === null || (record(value.info) && Number.isSafeInteger(value.info.sellerId) && typeof value.info.updatedAt === "string"))) {
    throw new ApiRequestError("Не удалось прочитать реквизиты продавца", "invalid-response");
  }
  return value as AdminLegalReview;
}
export async function reviewSellerLegal(sellerId: number, expectedUpdatedAt: string, changeRequestId?: number, note?: string): Promise<AdminLegalReview> {
  const path = changeRequestId === undefined ? "verify" : `change-requests/${changeRequestId}/reopen`;
  return adminResult(await request(`/api/admin/sellers/${sellerId}/legal-review/${path}`, "POST", { expectedUpdatedAt, note }));
}
export async function getLegalChangeQueue(page: number): Promise<LegalRequestQueue> {
  const value = await request(`/api/admin/sellers/legal-change-requests?page=${page}`);
  if (!record(value) || !Array.isArray(value.content) || !Number.isSafeInteger(value.totalPages) || !Number.isSafeInteger(value.totalElements)
    || !value.content.every(item => record(item) && Number.isSafeInteger(item.sellerId) && typeof item.sellerName === "string" && review({verified:false, verifiedAt:null, changeRequest:item.changeRequest}))) {
    throw new ApiRequestError("Не удалось прочитать очередь запросов", "invalid-response");
  }
  return value as LegalRequestQueue;
}
