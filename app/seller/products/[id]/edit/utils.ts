export function numberOrNull(value: number | "") {
  return value === "" ? null : Number(value);
}

export function formatProductStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Черновик",
    MODERATION: "На модерации",
    ACTIVE: "Активен",
    ARCHIVED: "Архив",
    BLOCKED: "Заблокирован",
  };

  return labels[status] ?? status;
}