export function formatCdekShipmentStatus(status: string): string {
  switch (status) {
    case "NEW":
    case "CREATED":
      return "Создан";
    case "PROCESSING":
      return "Оформляется";
    case "ACCEPTED":
      return "Принят СДЭК";
    case "IN_TRANSIT":
      return "В пути";
    case "READY_FOR_PICKUP":
      return "Готов к выдаче";
    case "DELIVERED":
      return "Вручен";
    case "NOT_DELIVERED":
      return "Не вручен";
    case "CANCELLED":
      return "Отменен";
    case "FAILED":
      return "Ошибка оформления";
    default:
      return status;
  }
}
