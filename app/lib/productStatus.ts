import type { StatusBadgeTone } from "../components/ui/StatusBadge";

export type ProductStatusValue =
  | "DRAFT"
  | "MODERATION"
  | "NEEDS_REVISION"
  | "ACTIVE"
  | "ARCHIVED"
  | "BLOCKED"
  | "DELETED"
  | string
  | null
  | undefined;

export function formatProductStatus(status: ProductStatusValue) {
  switch (status) {
    case "DRAFT":
      return "Черновик";
    case "MODERATION":
      return "На модерации";
    case "NEEDS_REVISION":
      return "На доработке";
    case "ACTIVE":
      return "Активен";
    case "ARCHIVED":
      return "В архиве";
    case "BLOCKED":
      return "Заблокирован";
    case "DELETED":
      return "Удалён";
    default:
      return "Статус не указан";
  }
}

export function getProductStatusTone(
  status: ProductStatusValue
): StatusBadgeTone {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "MODERATION":
    case "NEEDS_REVISION":
      return "warning";
    case "BLOCKED":
    case "DELETED":
      return "danger";
    default:
      return "default";
  }
}
