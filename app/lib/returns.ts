import { API_URL } from "./api";
import { resolveReturnPhotoUrl } from "./returnPhotoUrls";
import { getImageUploadMetadataError } from "./imageUploadPolicy";
import { ApiRequestError, readApiError, readApiJson } from "./apiErrors";
import { requestApiResponse } from "./apiRequest";
import type { components } from "./generated/order-api";

export type ReturnWorkflow = components["schemas"]["ReturnWorkflowResponse"];
export type ReturnAction = components["schemas"]["ReturnAction"];

export function returnAction(request: { workflow?: ReturnWorkflow | null }, code: ReturnAction) {
  const workflow = request.workflow;
  if (!workflow || workflow.version !== 1 || !Array.isArray(workflow.actions))
    return { allowed: false, reason: "Обновите возврат — информация о действиях пока недоступна" };
  const action = workflow.actions.find(item => item && item.code === code);
  if (!action || typeof action.allowed !== "boolean")
    return { allowed: false, reason: "Действие недоступно в этом кабинете" };
  return action;
}

export class ReturnSubmitError extends Error {
  constructor(message: string, public resultUnknown: boolean) { super(message); }
}

export type ReturnReason =
  | "DEFECT"
  | "WRONG_ITEM"
  | "DAMAGED"
  | "DAMAGED_DELIVERY"
  | "DOES_NOT_FIT"
  | "DID_NOT_FIT"
  | "BUYER_CHANGED_MIND"
  | "OTHER";

export type ReturnRequestStatus =
  | "SUBMITTED"
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "AWAITING_SHIPMENT"
  | "WAITING_FOR_ITEM"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "INSPECTED"
  | "REFUND_PENDING"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "CLOSED";

// The detail DTO comes from OpenAPI; status/reason retain compatibility with legacy projections.
export type ReturnRequest = Omit<components["schemas"]["FrontendReturnRequestResponse"],
  "workflow" | "status" | "reason" | "requestedAmount" | "requestKey"> & {
  workflow?: ReturnWorkflow | null;
  requestKey?: string | null;
  reason: ReturnReason;
  status: ReturnRequestStatus;
  requestedAmount: number | null;
  // Legacy response compatibility; current DTO can omit the linked ID.
  refundId?: number | null;
};

function normalizeReturnPhotos(request: ReturnRequest): ReturnRequest {
  return {
    ...request,
    photoUrls: (request.photoUrls ?? [])
      .map((url) => resolveReturnPhotoUrl(url, API_URL))
      .filter((url): url is string => url !== null),
  };
}

export type SellerReturnListItem = Pick<
  ReturnRequest,
  | "id"
  | "orderId"
  | "productId"
  | "variantId"
  | "productTitle"
  | "sku"
  | "quantity"
  | "reason"
  | "comment"
  | "status"
  | "cdekNumber"
  | "requestedAmount"
  | "approvedRefundAmount"
  | "sellerComment"
  | "resellable"
  | "createdAt"
  | "updatedAt"
>;

export type SellerReturnsPage = {
  items: SellerReturnListItem[];
  page: number;
  totalPages: number;
  totalItems: number;
};

export type AccountReturnListItem = { imageUrl?: string | null; manualDelivery?: boolean } & Pick<
  ReturnRequest,
  | "id"
  | "orderId"
  | "productId"
  | "variantId"
  | "productTitle"
  | "sku"
  | "quantity"
  | "reason"
  | "comment"
  | "status"
  | "adminComment"
  | "cdekNumber"
  | "trackingUrl"
  | "requestedAmount"
  | "approvedRefundAmount"
  | "createdAt"
  | "updatedAt"
>;

export type AccountReturnsPage = {
  items: AccountReturnListItem[];
  page: number;
  totalPages: number;
  totalItems: number;
};

export const returnReasonLabels: Record<ReturnReason, string> = {
  DEFECT: "Брак или дефект",
  WRONG_ITEM: "Прислали другой товар",
  DAMAGED: "Товар повреждён",
  DAMAGED_DELIVERY: "Товар повреждён при доставке",
  DOES_NOT_FIT: "Не подошёл размер или фасон",
  DID_NOT_FIT: "Не подошёл размер или фасон",
  BUYER_CHANGED_MIND: "Передумал",
  OTHER: "Другая причина",
};

export const returnStatusLabels: Record<ReturnRequestStatus, string> = {
  SUBMITTED: "На рассмотрении",
  REQUESTED: "На рассмотрении",
  APPROVED: "Возврат одобрен",
  REJECTED: "Возврат отклонён",
  AWAITING_SHIPMENT: "Ожидает отправки",
  WAITING_FOR_ITEM: "Ожидает получения продавцом",
  IN_TRANSIT: "Возвращается продавцу",
  RECEIVED: "Получен продавцом",
  INSPECTED: "Товар проверен",
  REFUND_PENDING: "Возврат денег оформляется",
  PARTIALLY_REFUNDED: "Деньги возвращены частично",
  REFUNDED: "Деньги возвращены",
  CLOSED: "Возврат закрыт",
};

const RETURN_MESSAGES: Readonly<Record<string, string>> = {
  "Not your order": "Заказ недоступен для этого аккаунта",
  "Not your return": "Возврат недоступен для этого аккаунта",
  "Return request not found": "Заявка на возврат не найдена",
  "Invalid return request key": "Не удалось подготовить заявку — обновите заказ",
  "Return request key was already used": "Заявка уже изменилась — обновите список возвратов",
  "Return is allowed only for paid orders": "Возврат доступен только для оплаченного заказа",
  "Return is allowed only after delivery": "Возврат будет доступен после получения заказа",
  "The 14-day return period has expired": "Срок подачи заявки на возврат истёк",
  "Return quantity exceeds remaining quantity": "Количество для возврата изменилось — обновите заказ",
  "No quantity remains available for return": "Все доступные единицы уже включены в возврат",
  "Between 1 and 5 photos are required": "Добавьте от 1 до 5 фотографий",
  "Invalid return photo": "Используйте JPG, PNG или WebP до 10 МБ",
  "reason is required": "Выберите причину возврата",
  "Unsupported return reason": "Выберите доступную причину возврата",
  "Invalid return status transition": "Статус возврата изменился — обновите заявку",
  "resellable and acceptedRefundAmount are required": "Укажите состояние товара и согласованную сумму возврата",
  "Accepted refund amount is outside the allowed range": "Согласованная сумма превышает доступную сумму возврата",
  "amount is required": "Укажите сумму возврата",
  "Refund amount has more than two decimal places": "Укажите сумму с точностью до копеек",
  "Refund amount must be positive": "Сумма возврата должна быть больше нуля",
  "Refund amount exceeds the accepted amount": "Сумма возврата превышает согласованную сумму",
  "Only requested return can be approved": "Заявка уже рассмотрена — обновите её перед действием",
  "Only requested return can be rejected": "Заявка уже рассмотрена — обновите её перед действием",
  "Admin comment is required for rejection": "Укажите причину отклонения заявки",
  "Use the linked bank refund operation": "Для этой заявки используйте связанную операцию возврата денег",
  "Return must be approved before refund": "Сначала одобрите заявку на возврат",
  "Return delivery cost cannot be negative": "Стоимость обратной доставки не может быть отрицательной",
  "Return refund is not pending": "Операция возврата уже изменилась — обновите заявку",
};
const UNKNOWN_ACTION = "Не удалось подтвердить результат — обновите заявку перед повторным действием";
const UNKNOWN_SUBMISSION = "Не удалось подтвердить отправку — обновите список возвратов перед повторной отправкой";

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

type ReturnListRow = Pick<SellerReturnListItem,
  "id" | "orderId" | "productId" | "variantId" | "quantity" | "productTitle" | "status" | "reason">;

function returnListRow(value: unknown): value is ReturnListRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return [row.id, row.orderId, row.productId, row.variantId, row.quantity]
    .every(item => nonnegativeInteger(item) && item > 0)
    && typeof row.productTitle === "string"
    && typeof row.status === "string" && Object.hasOwn(returnStatusLabels, row.status)
    && typeof row.reason === "string" && Object.hasOwn(returnReasonLabels, row.reason)
    && [row.sku, row.cdekNumber, row.comment, row.adminComment, row.trackingUrl, row.sellerComment, row.imageUrl]
      .every(item => item == null || typeof item === "string");
}

function returnPayload(data: unknown, fallback: string): ReturnRequest {
  if (!returnListRow(data)) throw new ApiRequestError(fallback, "invalid-response");
  const item = data as ReturnRequest;
  if (item.photoUrls != null && (!Array.isArray(item.photoUrls)
      || item.photoUrls.some(url => typeof url !== "string"))) {
    throw new ApiRequestError(fallback, "invalid-response");
  }
  return normalizeReturnPhotos(item);
}

function returnArray(data: unknown, fallback: string): ReturnRequest[] {
  if (!Array.isArray(data)) throw new ApiRequestError(fallback, "invalid-response");
  return data.map(item => returnPayload(item, fallback));
}

function returnPage<T extends ReturnListRow>(data: unknown, page: number, size: number, fallback: string) {
  const fail = (): never => { throw new ApiRequestError(fallback, "invalid-response"); };
  if (!data || typeof data !== "object" || Array.isArray(data)) return fail();
  const payload = data as Record<string, unknown>;
  if (!Array.isArray(payload.content)
    || !nonnegativeInteger(payload.number) || payload.number !== page
    || (payload.size !== undefined && (!nonnegativeInteger(payload.size) || payload.size !== size))
    || !nonnegativeInteger(payload.totalPages) || !nonnegativeInteger(payload.totalElements)
    || payload.totalPages !== Math.ceil(payload.totalElements / size)
    || payload.content.length > size || payload.content.length > payload.totalElements
    || (payload.numberOfElements !== undefined && payload.numberOfElements !== payload.content.length)) return fail();
  const ids = new Set<number>();
  for (const item of payload.content) {
    if (!returnListRow(item) || ids.has(item.id)) return fail();
    ids.add(item.id);
  }
  return { items: payload.content as T[], page: payload.number, totalPages: payload.totalPages, totalItems: payload.totalElements };
}

async function returnHttpError(response: Response, fallback: string, knownRejected = false): Promise<ApiRequestError> {
  try {
    return await readApiError(response, fallback, RETURN_MESSAGES);
  } catch (error) {
    if (!knownRejected) throw error;
    // A received HTTP rejection remains known even if its error body is unreadable.
    return new ApiRequestError(response.status === 401 ? "Войдите в аккаунт ещё раз" :
      response.status === 403 ? "Недостаточно прав для этого действия" : fallback, "http", response.status);
  }
}

function unknownAction(error: unknown): ApiRequestError {
  return error instanceof ApiRequestError
    ? new ApiRequestError(UNKNOWN_ACTION, error.kind, error.status, error.code)
    : new ApiRequestError(UNKNOWN_ACTION, "network");
}

async function mutateReturn(url: string, options: RequestInit, fallback: string): Promise<ReturnRequest> {
  let response: Response;
  try {
    response = await requestApiResponse(url, options, UNKNOWN_ACTION);
  } catch (error) {
    throw unknownAction(error);
  }
  if (!response.ok) {
    if (response.status < 400 || response.status >= 500) {
      throw new ApiRequestError(UNKNOWN_ACTION, "http", response.status);
    }
    throw await returnHttpError(response, fallback, true);
  }
  try {
    return returnPayload(await readApiJson<unknown>(response, fallback), fallback);
  } catch (error) {
    throw unknownAction(error);
  }
}

export async function getSellerReturn(id: number, signal?: AbortSignal): Promise<ReturnRequest> {
  const fallback = "Не удалось загрузить возврат";
  const response = await requestApiResponse(`${API_URL}/api/seller/returns/${id}`, { signal }, fallback);
  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      throw new ApiRequestError("Возврат не найден или недоступен", "http", response.status);
    }
    throw await returnHttpError(response, fallback);
  }
  return returnPayload(await readApiJson<unknown>(response, fallback), fallback);
}

export async function getOrderReturns(orderId: number): Promise<ReturnRequest[]> {
  const fallback = "Не удалось загрузить заявки на возврат";
  const response = await requestApiResponse(`${API_URL}/api/orders/${orderId}/returns`, {}, fallback);
  if (response.status === 404) return [];
  if (!response.ok) throw await returnHttpError(response, fallback);
  return returnArray(await readApiJson<unknown>(response, fallback), fallback);
}

export async function getAccountReturns(params: {
  page?: number;
  size?: number;
  signal?: AbortSignal;
} = {}): Promise<AccountReturnsPage> {
  const page = Math.max(0, params.page ?? 0);
  const size = Math.min(50, Math.max(1, params.size ?? 20));
  const fallback = "Не удалось загрузить возвраты";
  const response = await requestApiResponse(
    `${API_URL}/api/returns/my/list?page=${page}&size=${size}`,
    { signal: params.signal }, fallback
  );
  if (response.status === 404) {
    return { items: [], page, totalPages: 0, totalItems: 0 };
  }
  if (!response.ok) throw await returnHttpError(response, fallback);
  return returnPage<AccountReturnListItem>(await readApiJson<unknown>(response, fallback), page, size, fallback);
}

export async function createOrderReturn(params: {
  orderId: number;
  productId: number;
  variantId: number;
  reason: ReturnReason;
  comment: string;
  photos: File[];
  quantity?: number;
  requestKey?: string;
}): Promise<ReturnRequest> {
  const validationMessage = params.photos.map(photo => getImageUploadMetadataError(photo)).find(Boolean);
  if (validationMessage) throw new ReturnSubmitError(validationMessage, false);
  const body = new FormData();
  body.set("productId", String(params.productId));
  body.set("variantId", String(params.variantId));
  body.set("reason", params.reason);
  if (params.quantity !== undefined) body.set("quantity", String(params.quantity));
  if (params.requestKey) body.set("requestKey", params.requestKey);
  body.set("comment", params.comment.trim());
  params.photos.forEach((photo) => body.append("photos", photo));

  let response: Response;
  try {
    response = await requestApiResponse(`${API_URL}/api/orders/${params.orderId}/returns`,
      { method: "POST", body }, UNKNOWN_SUBMISSION);
  } catch {
    throw new ReturnSubmitError(UNKNOWN_SUBMISSION, true);
  }
  if (!response.ok) {
    const unknown = response.status < 400 || response.status >= 500;
    const failure = unknown ? UNKNOWN_SUBMISSION :
      (await returnHttpError(response, "Не удалось создать заявку на возврат — попробуйте ещё раз", true)).message;
    throw new ReturnSubmitError(failure, unknown);
  }
  try {
    return returnPayload(await readApiJson<unknown>(response, UNKNOWN_SUBMISSION), UNKNOWN_SUBMISSION);
  } catch {
    throw new ReturnSubmitError(UNKNOWN_SUBMISSION, true);
  }
}

export async function getAdminOrderReturns(
  orderId: number
): Promise<ReturnRequest[]> {
  const fallback = "Не удалось загрузить заявки на возврат";
  const response = await requestApiResponse(`${API_URL}/api/admin/orders/${orderId}/returns`, {}, fallback);
  if (response.status === 404) return [];
  if (!response.ok) throw await returnHttpError(response, fallback);
  return returnArray(await readApiJson<unknown>(response, fallback), fallback);
}

export async function reviewAdminReturn(
  returnId: number,
  decision: "approve" | "reject",
  comment = ""
): Promise<ReturnRequest> {
  return mutateReturn(
    `${API_URL}/api/admin/returns/${returnId}/${decision}`,
    {
      method: "POST",
      body: JSON.stringify({ comment: comment.trim() || null }),
    }, "Не удалось рассмотреть заявку"
  );
}

export async function getSellerReturns(params: {
  page?: number;
  size?: number;
  signal?: AbortSignal;
} = {}): Promise<SellerReturnsPage> {
  const page = Math.max(0, params.page ?? 0);
  const size = Math.min(50, Math.max(1, params.size ?? 20));
  const fallback = "Не удалось загрузить возвраты";
  const response = await requestApiResponse(
    `${API_URL}/api/seller/returns/list?page=${page}&size=${size}`,
    { signal: params.signal }, fallback
  );
  if (!response.ok) throw await returnHttpError(response, fallback);
  return returnPage<SellerReturnListItem>(await readApiJson<unknown>(response, fallback), page, size, fallback);
}

export async function markSellerReturnReceived(
  returnId: number
): Promise<ReturnRequest> {
  return mutateReturn(
    `${API_URL}/api/seller/returns/${returnId}/received`,
    { method: "POST" }, "Не удалось подтвердить получение товара"
  );
}

export async function inspectSellerReturn(
  returnId: number,
  params: {
    resellable: boolean;
    acceptedRefundAmount: number;
    comment: string;
  }
): Promise<ReturnRequest> {
  return mutateReturn(
    `${API_URL}/api/seller/returns/${returnId}/inspect`,
    {
      method: "POST",
      body: JSON.stringify({
        resellable: params.resellable,
        acceptedRefundAmount: params.acceptedRefundAmount,
        comment: params.comment.trim() || null,
      }),
    }, "Не удалось сохранить результат проверки"
  );
}

export async function refundAdminReturn(
  returnId: number,
  amount?: number
): Promise<ReturnRequest> {
  return mutateReturn(
    `${API_URL}/api/admin/returns/${returnId}/refund`,
    {
      method: "POST",
      body: JSON.stringify(amount === undefined ? {} : { amount }),
    }, "Не удалось провести возврат денег"
  );
}
