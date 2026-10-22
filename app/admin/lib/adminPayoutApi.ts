import { API_URL, apiFetch } from "../../lib/api";
import { ApiRequestError, readApiError, toApiError } from "../../lib/apiErrors";
import type { AdminSellerPayout, AdminSellerPayoutStats, AdminSellerPayoutStatus, PageResponse, PayoutGenerationResult } from "../types";

export const PAYOUT_STATUSES: Record<AdminSellerPayoutStatus, string> = {
  READY: "Готова к обработке", IN_PROGRESS: "В обработке", SENT: "Отправлена в банк", REVIEW: "На сверке",
  PAID: "Выплачена", FAILED: "Отказ подтверждён", CANCELLED: "Отменена",
};
export type PayoutAction = "BEGIN" | "SENT" | "REVIEW" | "PAID" | "FAILED" | "RETRY" | "CANCEL";
export type PayoutAttempt = {
  id: number; number: number; status: string; startedAt: string | null; startedBy: number | null;
  paymentOrderNumber: string | null; sentAt: string | null; resolvedAt: string | null; evidence: string | null; legacy: boolean;
};
export type PayoutHistory = {
  id: number; attemptId: number | null; action: string; fromStatus: AdminSellerPayoutStatus | null;
  toStatus: AdminSellerPayoutStatus; actorId: number | null; reason: string | null; evidence: string | null; createdAt: string;
};
export type AdminPayoutDetail = { payout: AdminSellerPayout; version: number; allowedActions: PayoutAction[]; attempts: PayoutAttempt[]; history: PayoutHistory[] };
export type PayoutActionPayload = { expectedVersion: number; attemptId?: number; paymentOrderNumber?: string; comment?: string; evidence?: string };
export type PayoutStats = AdminSellerPayoutStats & { inProgressAmount: number; reviewAmount: number; failedAmount: number; requiresAttentionCount: number };

const businessMessages: Readonly<Record<string, string>> = {
  PAYOUT_STALE_VERSION: "Реестр изменён другим оператором — обновите данные перед действием",
  PAYOUT_STALE_ATTEMPT: "Банковская попытка изменилась — обновите данные перед действием",
  PAYOUT_ACTION_NOT_ALLOWED: "Действие больше недоступно — обновите реестр",
  PAYOUT_REASON_REQUIRED: "Укажите причину действия",
  PAYOUT_EVIDENCE_REQUIRED: "Укажите основание банковского результата",
  PAYOUT_PAYMENT_ORDER_REQUIRED: "Укажите номер платёжного поручения",
  PAYOUT_REQUEST_INVALID: "Проверьте данные действия и обновите реестр",
  PAYOUT_PAYMENT_ORDER_MISMATCH: "Номер поручения уже зафиксирован — укажите прежний номер и проверьте банковскую попытку",
  PAYOUT_PAYMENT_REVIEW_REQUIRED: "Заказ ожидает сверки платежа или возврата — выплата временно заблокирована",
  PAYOUT_OPEN_RETURN: "В реестре есть заказ с открытым возвратом — отмените реестр и сформируйте новый после проверки",
  PAYOUT_AMOUNT_CHANGED: "После возврата сумма изменилась — отмените реестр и сформируйте новый",
  "Банковские реквизиты не заполнены": "Не заполнены банковские реквизиты продавца",
  "Не указано наименование получателя": "Не указано наименование получателя",
  "ИНН должен содержать 10 или 12 цифр": "Проверьте ИНН продавца — требуется 10 или 12 цифр",
  "Не указано название банка": "Не указано название банка",
  "БИК должен содержать 9 цифр": "Проверьте БИК — требуется 9 цифр",
  "Расчётный счёт должен содержать 20 цифр": "Проверьте расчётный счёт — требуется 20 цифр",
  "Корреспондентский счёт должен содержать 20 цифр": "Проверьте корреспондентский счёт — требуется 20 цифр",
  "Продавец не принял условия договора": "Продавец не принял условия договора",
  "Реквизиты изменились после создания реестра. Отмените выплату и сформируйте новый реестр": "Реквизиты изменились после создания реестра — отмените его и сформируйте новый",
  "Сумма выплаты не совпадает с составом реестра. Требуется сверка": "Сумма выплаты не совпадает с составом реестра — требуется сверка",
  "После создания реестра появились удержания. Отмените выплату и сформируйте новый реестр": "После создания реестра появились удержания — отмените его и сформируйте новый",
};

/** Skip reasons and error bodies are never rendered verbatim. */
export function payoutSkipReason(reason: string): string {
  return ({
    "Seller not found": "Продавец не найден",
    "An active payout already exists for this date": "У продавца уже есть незавершённая выплата",
    "Bank details are not configured": "Не заполнены банковские реквизиты",
    "Legal name is missing": "Не указано имя или наименование получателя",
    "INN is missing": "Не указан ИНН",
    "Bank name is missing": "Не указан банк",
    "BIK is missing": "Не указан БИК",
    "Checking account is missing": "Не указан расчётный счёт",
    "Net payout amount is not positive": "Нет положительной суммы к выплате",
    "No positive amount available for payout": "Нет положительной суммы к выплате",
  } as Record<string, string>)[reason] ?? businessMessages[reason] ?? "Реестр не сформирован — проверьте реквизиты и незавершённые выплаты продавца";
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  try {
    const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000);
    const response = await apiFetch(`${API_URL}/api/admin/finance/payouts${path}`, { ...options, signal });
    if (!response.ok) throw await readApiError(response, options.method === "POST"
      ? "Не удалось подтвердить результат действия — обновите реестр перед продолжением"
      : "Не удалось загрузить выплаты — попробуйте ещё раз", businessMessages);
    return response;
  } catch (reason) {
    if (options.signal?.aborted) throw reason;
    throw toApiError(reason, "Не удалось связаться с сервером — обновите реестр перед продолжением");
  }
}

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object"; }
function payout(value: unknown): value is AdminSellerPayout {
  return record(value) && Number.isSafeInteger(value.id) && typeof value.status === "string" && Object.hasOwn(PAYOUT_STATUSES, value.status)
    && ["payoutAmount", "grossSalesAmount", "commissionAmount", "adjustmentsAmount"].every(key => typeof value[key] === "number" && Number.isFinite(value[key]));
}
function invalid(): never { throw new ApiRequestError("Не удалось прочитать выплаты — обновите данные", "invalid-response"); }
async function json(response: Response): Promise<unknown> { try { return await response.json(); } catch { return invalid(); } }

export async function getPayouts(status: AdminSellerPayoutStatus | "ALL", page: number, signal: AbortSignal): Promise<PageResponse<AdminSellerPayout>> {
  const query = new URLSearchParams({ page: String(page), size: "20" });
  if (status !== "ALL") query.set("status", status);
  const data = await json(await request(`/list?${query}`, { signal }));
  if (!record(data) || !Array.isArray(data.content) || !data.content.every(payout) || !Number.isSafeInteger(data.totalPages) || !Number.isSafeInteger(data.totalElements)) return invalid();
  return data as PageResponse<AdminSellerPayout>;
}
export async function getPayoutStats(signal: AbortSignal): Promise<PayoutStats> {
  const data = await json(await request("/stats", { signal }));
  if (!record(data) || !["readyAmount", "sentAmount", "inProgressAmount", "reviewAmount", "failedAmount", "totalCount", "requiresAttentionCount"].every(key => typeof data[key] === "number" && Number.isFinite(data[key]))) return invalid();
  return data as PayoutStats;
}
export async function getPayoutDetail(id: number, signal?: AbortSignal): Promise<AdminPayoutDetail> {
  const data = await json(await request(`/${id}`, { signal }));
  const actions = new Set(["BEGIN", "SENT", "REVIEW", "PAID", "FAILED", "RETRY", "CANCEL"]);
  if (!record(data) || !payout(data.payout) || data.payout.id !== id || !Number.isSafeInteger(data.version) || (data.version as number) < 0
      || !Array.isArray(data.allowedActions) || !data.allowedActions.every(action => actions.has(action))
      || !Array.isArray(data.attempts) || !data.attempts.every(attempt => record(attempt) && Number.isSafeInteger(attempt.id) && Number.isSafeInteger(attempt.number))
      || !Array.isArray(data.history) || !Array.isArray(data.payout.items)) return invalid();
  return data as AdminPayoutDetail;
}
export async function generatePayouts(): Promise<PayoutGenerationResult> {
  const data = await json(await request("/generate", { method: "POST" }));
  if (!record(data) || !Array.isArray(data.payouts) || !data.payouts.every(payout) || !Array.isArray(data.skipped)
      || !data.skipped.every(row => record(row) && typeof row.reason === "string" && typeof row.sellerName === "string" && Number.isSafeInteger(row.sellerId))) return invalid();
  return data as PayoutGenerationResult;
}
export async function applyPayoutAction(id: number, action: PayoutAction, payload: PayoutActionPayload): Promise<void> {
  await request(`/${id}/${action.toLowerCase()}`, { method: "POST", body: JSON.stringify(payload) });
}

export function payoutMoney(value: number, currency = "RUB"): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
