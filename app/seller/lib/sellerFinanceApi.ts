import { API_URL, apiFetch } from "../../lib/api";

export async function getFinanceData<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await apiFetch(`${API_URL}/api/seller/finance/${path}`, { signal });
  if (!response.ok) throw new Error(response.status === 404
    ? "Выплата не найдена или недоступна"
    : "Не удалось загрузить данные. Попробуйте ещё раз.");
  return response.json() as Promise<T>;
}

export async function exportFinanceOperations(query: string, signal: AbortSignal): Promise<Blob> {
  const response = await apiFetch(`${API_URL}/api/seller/finance/operations/export?${query}`, { signal });
  if (!response.ok) throw new Error("Не удалось выгрузить операции. Попробуйте ещё раз.");
  return response.blob();
}
