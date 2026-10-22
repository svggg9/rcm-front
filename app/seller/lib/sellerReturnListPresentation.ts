import type { ReturnRequestStatus, SellerReturnListItem } from "../../lib/returns";
import type { SegmentedControlItem } from "../../components/ui/SegmentedControl";

export type SellerReturnGroup = "all" | "active" | "inspection" | "completed";

export const sellerReturnSegments: readonly SegmentedControlItem<SellerReturnGroup>[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "В работе" },
  { value: "inspection", label: "Требуют проверки" },
  { value: "completed", label: "Завершены" },
];

const completedStatuses = new Set<ReturnRequestStatus>(["REJECTED", "PARTIALLY_REFUNDED", "REFUNDED", "CLOSED"]);

export function parseSellerReturnGroup(value: string | null): SellerReturnGroup {
  return value === "active" || value === "inspection" || value === "completed" ? value : "all";
}

export function sellerReturnGroup(status: ReturnRequestStatus): Exclude<SellerReturnGroup, "all"> {
  if (status === "RECEIVED") return "inspection";
  return completedStatuses.has(status) ? "completed" : "active";
}

export function filterSellerReturns(requests: SellerReturnListItem[], group: SellerReturnGroup, query: string): SellerReturnListItem[] {
  const normalized = query.trim().toLocaleLowerCase("ru");
  return requests.filter(request => (group === "all" || sellerReturnGroup(request.status) === group)
    && (!normalized || [request.id, request.orderId, request.productTitle, request.sku, request.cdekNumber]
      .some(value => value != null && String(value).toLocaleLowerCase("ru").includes(normalized))));
}
