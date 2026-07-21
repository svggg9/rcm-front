import { API_URL, apiFetch } from "../../lib/api";
import type {
  AdminProduct,
  AdminOrder,
  AdminOrderListItem,
  AdminSeller,
  DictionaryItem,
  DictionaryKind,
  PageResponse,
  ProductStatus,
  SellerFilter,
  AdminSellerApplication,
  SellerApplicationStatus,
  AdminFinancialLedgerEntry,
  AdminCdekWebhookEvent,
  FinancialLedgerEntryType,
  AdminSellerPayout,
  PayoutGenerationResult,
} from "../types";

async function readError(response: Response, fallback: string) {
  const text = await response.text().catch(() => "");
  return text || fallback;
}

export async function getAdminProducts(
  status: ProductStatus | "ALL",
  page = 0,
  size = 50
): Promise<PageResponse<AdminProduct>> {
  const query =
    status === "ALL"
      ? `page=${page}&size=${size}`
      : `status=${status}&page=${page}&size=${size}`;

  const response = await apiFetch(`${API_URL}/api/admin/products?${query}`);

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить товары"));
  }

  return response.json();
}

export async function getAdminProductStatusCounts(): Promise<
  Record<ProductStatus | "ALL", number>
> {
  const response = await apiFetch(`${API_URL}/api/admin/products/status-counts`);

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить счетчики товаров"));
  }

  return response.json();
}

export async function getAdminProduct(id: number): Promise<AdminProduct> {
  const response = await apiFetch(`${API_URL}/api/admin/products/${id}`);

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить товар"));
  }

  return response.json();
}

export async function getAdminOrders(
  page = 0,
  size = 50
): Promise<PageResponse<AdminOrderListItem>> {
  const response = await apiFetch(
    `${API_URL}/api/admin/orders/list?page=${page}&size=${size}`
  );

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить заказы"));
  }

  return response.json();
}

export async function getAdminOrder(id: number): Promise<AdminOrder> {
  const response = await apiFetch(`${API_URL}/api/admin/orders/${id}`);

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить заказ"));
  }

  return response.json();
}

export async function refundAdminOrder(id: number): Promise<void> {
  const response = await apiFetch(`${API_URL}/api/admin/orders/${id}/refund`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось вернуть оплату"));
  }
}

export async function approveProduct(id: number): Promise<void> {
  const response = await apiFetch(`${API_URL}/api/admin/products/${id}/approve`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось одобрить товар"));
  }
}

export async function returnProductToRevision(
    id: number,
    comment: string
  ): Promise<void> {
    const response = await apiFetch(`${API_URL}/api/admin/products/${id}/revision`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Не удалось вернуть товар на доработку"));
    }
  }

export async function blockProduct(id: number): Promise<void> {
  const response = await apiFetch(`${API_URL}/api/admin/products/${id}/block`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось заблокировать товар"));
  }
}

export async function unblockProduct(id: number): Promise<void> {
  const response = await apiFetch(`${API_URL}/api/admin/products/${id}/unblock`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось разблокировать товар"));
  }
}

export async function getAdminSellers(
  filter: SellerFilter,
  page = 0,
  size = 50
): Promise<PageResponse<AdminSeller>> {
  let url = `${API_URL}/api/admin/sellers?page=${page}&size=${size}`;

  if (filter === "REQUESTS") {
    url = `${API_URL}/api/admin/sellers/requests?page=${page}&size=${size}`;
  }

  if (filter === "APPROVED") {
    url = `${API_URL}/api/admin/sellers?approved=true&page=${page}&size=${size}`;
  }

  const response = await apiFetch(url);

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить продавцов"));
  }

  return response.json();
}

export async function approveSeller(id: number): Promise<void> {
  const response = await apiFetch(`${API_URL}/api/admin/sellers/${id}/approve`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось одобрить продавца"));
  }
}

export async function rejectSeller(id: number): Promise<void> {
  const response = await apiFetch(`${API_URL}/api/admin/sellers/${id}/reject`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось отклонить заявку"));
  }
}

export async function getAdminDictionary(
  kind: DictionaryKind
): Promise<DictionaryItem[]> {
  const response = await apiFetch(`${API_URL}/api/admin/dictionaries/${kind}`);

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить справочник"));
  }

  return response.json();
}

export async function createAdminDictionaryItem(
  kind: DictionaryKind,
  item: Partial<DictionaryItem>
): Promise<DictionaryItem> {
  const response = await apiFetch(`${API_URL}/api/admin/dictionaries/${kind}`, {
    method: "POST",
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось создать значение"));
  }

  return response.json();
}

export async function updateAdminDictionaryItem(
  kind: DictionaryKind,
  id: number,
  item: Partial<DictionaryItem>
): Promise<DictionaryItem> {
  const response = await apiFetch(
    `${API_URL}/api/admin/dictionaries/${kind}/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(item),
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось обновить значение"));
  }

  return response.json();
}

export async function deleteAdminDictionaryItem(
  kind: DictionaryKind,
  id: number
): Promise<void> {
  const response = await apiFetch(
    `${API_URL}/api/admin/dictionaries/${kind}/${id}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось отключить значение"));
  }
}

export async function getAdminSellerApplications(
  status: SellerApplicationStatus | "ALL",
  page = 0,
  size = 50
): Promise<PageResponse<AdminSellerApplication>> {
  const query =
    status === "ALL"
      ? `page=${page}&size=${size}`
      : `status=${status}&page=${page}&size=${size}`;

  const response = await apiFetch(
    `${API_URL}/api/admin/seller-applications?${query}`
  );

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить заявки"));
  }

  return response.json();
}

export async function getAdminLedgerEntries(params?: {
  entryType?: FinancialLedgerEntryType | "ALL";
  orderGroupId?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminFinancialLedgerEntry>> {
  const query = new URLSearchParams();
  query.set("page", String(params?.page ?? 0));
  query.set("size", String(params?.size ?? 50));

  if (params?.entryType && params.entryType !== "ALL") {
    query.set("entryType", params.entryType);
  }

  if (params?.orderGroupId?.trim()) {
    query.set("orderGroupId", params.orderGroupId.trim());
  }

  const response = await apiFetch(
    `${API_URL}/api/admin/finance/ledger?${query.toString()}`
  );

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить движения средств"));
  }

  return response.json();
}

export async function getAdminSellerPayouts(
  page = 0,
  size = 50
): Promise<PageResponse<AdminSellerPayout>> {
  const response = await apiFetch(
    `${API_URL}/api/admin/finance/payouts?page=${page}&size=${size}`
  );
  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить выплаты"));
  }
  return response.json();
}

export async function generateAdminSellerPayouts(): Promise<PayoutGenerationResult> {
  const response = await apiFetch(`${API_URL}/api/admin/finance/payouts/generate`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось сформировать реестр"));
  }
  return response.json();
}

export async function updateAdminSellerPayout(
  id: number,
  action: "sent" | "paid" | "failed" | "retry" | "cancel",
  payload?: { paymentOrderNumber?: string; comment?: string }
): Promise<AdminSellerPayout> {
  const response = await apiFetch(
    `${API_URL}/api/admin/finance/payouts/${id}/${action}`,
    {
      method: "POST",
      body: payload ? JSON.stringify(payload) : undefined,
    }
  );
  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось обновить выплату"));
  }
  return response.json();
}

export async function getAdminCdekWebhookEvents(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminCdekWebhookEvent>> {
  const query = new URLSearchParams();
  query.set("page", String(params?.page ?? 0));
  query.set("size", String(params?.size ?? 50));

  const response = await apiFetch(
    `${API_URL}/api/admin/delivery/cdek/webhook-events?${query.toString()}`
  );

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить события СДЭК"));
  }

  return response.json();
}

export async function getAdminSellerApplicationStatusCounts(): Promise<
  Record<SellerApplicationStatus | "ALL", number>
> {
  const response = await apiFetch(
    `${API_URL}/api/admin/seller-applications/status-counts`
  );

  if (!response.ok) {
    throw new Error(
      await readError(response, "Не удалось загрузить счетчики заявок")
    );
  }

  return response.json();
}

export async function approveSellerApplication(id: number): Promise<void> {
  const response = await apiFetch(
    `${API_URL}/api/admin/seller-applications/${id}/approve`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось одобрить заявку"));
  }
}

export async function rejectSellerApplication(
  id: number,
  comment?: string
): Promise<void> {
  const response = await apiFetch(
    `${API_URL}/api/admin/seller-applications/${id}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ comment: comment ?? null }),
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось отклонить заявку"));
  }
}

export async function assignProductCategory(
  id: number,
  categoryId: number
): Promise<void> {
  const response = await apiFetch(`${API_URL}/api/admin/products/${id}/category`, {
    method: "POST",
    body: JSON.stringify({ categoryId }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось назначить категорию"));
  }
}
