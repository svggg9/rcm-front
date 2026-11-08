import { API_URL } from "../../lib/api";
import { requestApiResponse } from "../../lib/apiRequest";
import { readApiBlob, readApiError, readApiJson } from "../../lib/apiErrors";

export async function getFinanceData<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await requestApiResponse(`${API_URL}/api/seller/finance/${path}`, { signal }, "Не удалось загрузить финансовые данные — попробуйте ещё раз");
  if (!response.ok) throw await readApiError(response, response.status === 404
    ? "Выплата не найдена или недоступна"
    : "Не удалось загрузить финансовые данные — попробуйте ещё раз");
  return readApiJson<T>(response, "Не удалось прочитать финансовые данные — попробуйте ещё раз");
}

export async function exportFinanceOperations(query: string, signal: AbortSignal): Promise<Blob> {
  const fallback = "Не удалось выгрузить операции — попробуйте ещё раз";
  const response = await requestApiResponse(`${API_URL}/api/seller/finance/operations/export?${query}`, { signal }, fallback);
  if (!response.ok) throw await readApiError(response, fallback);
  return readApiBlob(response, fallback);
}
