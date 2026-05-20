import { API_URL } from "./config";

export { API_URL };

export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function getSellerOrdersList(params?: {
  page?: number;
  size?: number;
}) {
  const search = new URLSearchParams();

  search.set("page", String(params?.page ?? 0));
  search.set("size", String(params?.size ?? 20));

  const response = await apiFetch(
    `${API_URL}/api/seller/orders/list?${search.toString()}`
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить список заказов");
  }

  return response.json();
}