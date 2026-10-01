import { apiFetch, API_URL } from "../../lib/api";
import type { IconName } from "../../components/ui/Icon";

// Retained for the existing order details view; queue deadlines come from the API.
export function shippingDeadline(paidAt?: string | null) {
  if (!paidAt) return undefined;
  const timestamp = Date.parse(paidAt);
  return Number.isFinite(timestamp) ? new Date(timestamp + 72 * 60 * 60 * 1000).toISOString() : undefined;
}

export type SellerTask = {
  id: string; title: string; object: string; description: string;
  action: string; href: string; icon: IconName;
  dueAt?: string | null; tone: "neutral" | "danger";
};
export type SellerTaskPage = { content: SellerTask[]; number: number; hasNext: boolean };

export async function getSellerTasks(signal: AbortSignal, category = "all", page = 0): Promise<SellerTaskPage> {
  const response = await apiFetch(`${API_URL}/api/seller/dashboard/tasks?category=${encodeURIComponent(category)}&page=${page}&size=20`, { signal });
  if (!response.ok) throw new Error("Не удалось загрузить задачи");
  return response.json() as Promise<SellerTaskPage>;
}
