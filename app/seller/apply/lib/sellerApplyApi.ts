import { apiFetch, API_URL } from "../../../lib/api";

import type { SellerApplication, SellerApplicationForm } from "../types";

export async function getMySellerApplication(): Promise<SellerApplication | null> {
  const response = await apiFetch(`${API_URL}/api/seller-applications/me`);

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Не удалось загрузить статус заявки");
  }

  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  return JSON.parse(text) as SellerApplication;
}

export async function createSellerApplication(
  payload: SellerApplicationForm
): Promise<SellerApplication> {
  const response = await apiFetch(`${API_URL}/api/seller-applications`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");

    throw new Error(text || "Не удалось отправить заявку");
  }

  return response.json();
}