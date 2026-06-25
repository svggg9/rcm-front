import type { StatusBadgeTone } from "../../../../components/ui/StatusBadge";

export function numberOrNull(value: number | "") {
  return value === "" ? null : Number(value);
}

export function formatProductStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Черновик",
    MODERATION: "На модерации",
    NEEDS_REVISION: "Нужна доработка",
    ACTIVE: "Активен",
    ARCHIVED: "Архив",
    BLOCKED: "Заблокирован",
  };

  return labels[status] ?? status;
}

export function getProductStatusTone(status: string): StatusBadgeTone {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "MODERATION":
    case "NEEDS_REVISION":
      return "warning";
    case "BLOCKED":
      return "danger";
    default:
      return "default";
  }
}
