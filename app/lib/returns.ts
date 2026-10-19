import { API_URL, apiFetch } from "./api";
import { resolveReturnPhotoUrl } from "./returnPhotoUrls";
import { accountApiError } from "../account/lib/presentation";

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

export type ReturnRequest = {
  requestKey?: string | null;
  id: number;
  orderId: number;
  productId: number;
  variantId: number;
  productTitle: string;
  sku: string | null;
  quantity: number;
  reason: ReturnReason;
  comment: string | null;
  photoUrls: string[];
  status: ReturnRequestStatus;
  adminComment: string | null;
  cdekNumber: string | null;
  trackingUrl: string | null;
  requestedAmount: number | null;
  approvedRefundAmount: number | null;
  refundId?: number | null;
  sellerComment?: string | null;
  resellable?: boolean | null;
  createdAt: string;
  updatedAt: string;
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

export type AccountReturnListItem = { imageUrl?: string | null } & Pick<
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

export async function getSellerReturn(id: number, signal?: AbortSignal): Promise<ReturnRequest> {
  const response = await apiFetch(`${API_URL}/api/seller/returns/${id}`, { signal });
  if (!response.ok) throw new Error(response.status === 403 || response.status === 404
    ? "Возврат не найден или недоступен" : "Не удалось загрузить возврат");
  return normalizeReturnPhotos(await response.json());
}

export async function getOrderReturns(orderId: number): Promise<ReturnRequest[]> {
  const response = await apiFetch(`${API_URL}/api/orders/${orderId}/returns`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("Не удалось загрузить заявки на возврат");
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as ReturnRequest[]).map(normalizeReturnPhotos) : [];
}

export async function getAccountReturns(params: {
  page?: number;
  size?: number;
  signal?: AbortSignal;
} = {}): Promise<AccountReturnsPage> {
  const page = Math.max(0, params.page ?? 0);
  const size = Math.min(50, Math.max(1, params.size ?? 20));
  const response = await apiFetch(
    `${API_URL}/api/returns/my/list?page=${page}&size=${size}`,
    { signal: params.signal }
  );
  if (response.status === 404) {
    return { items: [], page, totalPages: 0, totalItems: 0 };
  }
  if (!response.ok) throw new Error("Не удалось загрузить возвраты");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") {
    return { items: [], page, totalPages: 0, totalItems: 0 };
  }
  const payload = data as {
    content?: AccountReturnListItem[];
    number?: number;
    totalPages?: number;
    totalElements?: number;
  };
  return {
    items: Array.isArray(payload.content) ? payload.content : [],
    page: typeof payload.number === "number" ? payload.number : page,
    totalPages:
      typeof payload.totalPages === "number" ? payload.totalPages : 0,
    totalItems:
      typeof payload.totalElements === "number" ? payload.totalElements : 0,
  };
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
  const body = new FormData();
  body.set("productId", String(params.productId));
  body.set("variantId", String(params.variantId));
  body.set("reason", params.reason);
  if (params.quantity !== undefined) body.set("quantity", String(params.quantity));
  if (params.requestKey) body.set("requestKey", params.requestKey);
  body.set("comment", params.comment.trim());
  params.photos.forEach((photo) => body.append("photos", photo));

  const response = await apiFetch(
    `${API_URL}/api/orders/${params.orderId}/returns`,
    { method: "POST", body, signal: AbortSignal.timeout(20000) }
  ).catch(() => { throw new ReturnSubmitError("Не удалось подтвердить результат — повторите отправку", true); });
  if (!response.ok) {
    throw new ReturnSubmitError(await accountApiError(response, "Не удалось создать заявку на возврат — попробуйте ещё раз"), response.status >= 500);
  }
  return normalizeReturnPhotos(await response.json());
}

export async function getAdminOrderReturns(
  orderId: number
): Promise<ReturnRequest[]> {
  const response = await apiFetch(
    `${API_URL}/api/admin/orders/${orderId}/returns`
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("Не удалось загрузить заявки на возврат");
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as ReturnRequest[]).map(normalizeReturnPhotos) : [];
}

export async function reviewAdminReturn(
  returnId: number,
  decision: "approve" | "reject",
  comment = ""
): Promise<ReturnRequest> {
  const response = await apiFetch(
    `${API_URL}/api/admin/returns/${returnId}/${decision}`,
    {
      method: "POST",
      body: JSON.stringify({ comment: comment.trim() || null }),
    }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось рассмотреть заявку");
  }
  return normalizeReturnPhotos(await response.json());
}

export async function getSellerReturns(params: {
  page?: number;
  size?: number;
  signal?: AbortSignal;
} = {}): Promise<SellerReturnsPage> {
  const page = Math.max(0, params.page ?? 0);
  const size = Math.min(50, Math.max(1, params.size ?? 20));
  const response = await apiFetch(
    `${API_URL}/api/seller/returns/list?page=${page}&size=${size}`,
    { signal: params.signal }
  );
  if (response.status === 404) {
    return { items: [], page, totalPages: 0, totalItems: 0 };
  }
  if (!response.ok) throw new Error("Не удалось загрузить возвраты");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") {
    return { items: [], page, totalPages: 0, totalItems: 0 };
  }
  const payload = data as {
    content?: SellerReturnListItem[];
    number?: number;
    totalPages?: number;
    totalElements?: number;
  };
  return {
    items: Array.isArray(payload.content) ? payload.content : [],
    page: typeof payload.number === "number" ? payload.number : page,
    totalPages:
      typeof payload.totalPages === "number" ? payload.totalPages : 0,
    totalItems:
      typeof payload.totalElements === "number" ? payload.totalElements : 0,
  };
}

export async function markSellerReturnReceived(
  returnId: number
): Promise<ReturnRequest> {
  const response = await apiFetch(
    `${API_URL}/api/seller/returns/${returnId}/received`,
    { method: "POST" }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось подтвердить получение товара");
  }
  return normalizeReturnPhotos(await response.json());
}

export async function inspectSellerReturn(
  returnId: number,
  params: {
    resellable: boolean;
    acceptedRefundAmount: number;
    comment: string;
  }
): Promise<ReturnRequest> {
  const response = await apiFetch(
    `${API_URL}/api/seller/returns/${returnId}/inspect`,
    {
      method: "POST",
      body: JSON.stringify({
        resellable: params.resellable,
        acceptedRefundAmount: params.acceptedRefundAmount,
        comment: params.comment.trim() || null,
      }),
    }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось сохранить результат проверки");
  }
  return normalizeReturnPhotos(await response.json());
}

export async function refundAdminReturn(
  returnId: number,
  amount: number
): Promise<ReturnRequest> {
  const response = await apiFetch(
    `${API_URL}/api/admin/returns/${returnId}/refund`,
    {
      method: "POST",
      body: JSON.stringify({ amount }),
    }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось провести возврат денег");
  }
  return normalizeReturnPhotos(await response.json());
}
