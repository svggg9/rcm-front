import { API_URL, apiFetch } from "../../lib/api";
import type {
  AdminProduct,
  AdminSeller,
  PageResponse,
  ProductStatus,
  SellerFilter,
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

export async function getAdminProduct(id: number): Promise<AdminProduct> {
  const response = await apiFetch(`${API_URL}/api/admin/products/${id}`);

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось загрузить товар"));
  }

  return response.json();
}

export async function approveProduct(id: number): Promise<void> {
  const response = await apiFetch(`${API_URL}/api/admin/products/${id}/approve`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Не удалось одобрить товар"));
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