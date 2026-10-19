import { apiFetch, API_URL } from "../../lib/api";

export async function createSellerProductDraft(): Promise<number> {
  let response: Response;
  try {
    response = await apiFetch(`${API_URL}/api/seller/products/draft`, {
      method: "POST", signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("Сервер не подтвердил создание товара — проверьте список товаров перед повтором");
  }
  if (!response.ok) {
    throw new Error(response.status === 401 ? "Войдите в аккаунт и попробуйте снова"
      : response.status === 403 ? "Создание товара недоступно — проверьте данные магазина"
      : "Не удалось создать товар — попробуйте позже");
  }
  let id: unknown;
  try { id = await response.json(); } catch {
    throw new Error("Не удалось открыть созданный товар — проверьте список товаров");
  }
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Не удалось открыть созданный товар — проверьте список товаров");
  }
  return id;
}
