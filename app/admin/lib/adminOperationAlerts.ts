export type AdminOperationAlertKind = "payment" | "refund" | "delivery";
export type AdminOperationAlertLevel = "review" | "waiting" | "error";

export type AdminOperationAlert = {
  kind: AdminOperationAlertKind;
  reason: string;
  level: AdminOperationAlertLevel;
  orderId: number;
  operationId: number | null;
  status: string;
  referenceAt: string;
};

export type AdminOperationAlertPage = {
  summary: { payments: number; refunds: number; deliveries: number };
  content: AdminOperationAlert[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const positiveId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

/** A malformed response is an error, not an empty queue or a zero count. */
export function isAdminOperationAlertPage(value: unknown): value is AdminOperationAlertPage {
  if (!record(value) || !record(value.summary) || !Array.isArray(value.content)
      || ![value.summary.payments, value.summary.refunds, value.summary.deliveries].every(count)
      || !count(value.number) || !positiveId(value.size) || (value.size as number) > 100
      || !count(value.totalElements) || !count(value.totalPages)
      || (value.totalElements as number) < value.content.length || value.content.length > (value.size as number)) return false;
  return value.content.every(item => record(item)
    && ["payment", "refund", "delivery"].includes(item.kind as string)
    && ["review", "waiting", "error"].includes(item.level as string)
    && typeof item.reason === "string" && item.reason.length > 0
    && typeof item.status === "string" && item.status.length > 0
    && positiveId(item.orderId) && (item.operationId === null || positiveId(item.operationId))
    && typeof item.referenceAt === "string" && !Number.isNaN(Date.parse(item.referenceAt)));
}

const descriptions: Record<string, string> = {
  PAYMENT_REVIEW: "Платёж требует сверки",
  PAYMENT_INIT_OVERDUE: "Создание платежа не подтверждено",
  REFUND_REVIEW: "Возврат требует сверки с банком",
  REFUND_SENDING_STALE: "Отправка возврата долго не подтверждена",
  REFUND_SENDING_NO_TIME: "Отправка возврата без времени подтверждения",
  REFUND_READY_LONG: "Возврат долго ожидает отправки",
  REFUND_RETRY_OVERDUE: "Повторная проверка возврата задерживается",
  REFUND_ACKNOWLEDGED_LONG: "Возврат долго ожидает подтверждения банка",
  DELIVERY_FAILED: "Ошибка оформления доставки",
  DELIVERY_ERROR: "Доставка требует проверки",
  DELIVERY_PROCESSING_LONG: "Оформление доставки задерживается",
  DELIVERY_NOT_REGISTERED: "Доставка ещё не зарегистрирована",
  DELIVERY_NOT_DELIVERED: "Отправление не доставлено — проверьте заказ",
};

export function operationAlertDescription(reason: string): string {
  return Object.hasOwn(descriptions, reason) ? descriptions[reason] : "Операция требует проверки";
}

export function operationAlertQueue(kind: AdminOperationAlertKind): { href: string; label: string } {
  if (kind === "payment") return { href: "/admin?tab=orders&orderView=payments", label: "Очередь оплат" };
  if (kind === "refund") return { href: "/admin?tab=orders&orderView=refunds", label: "Очередь возвратов" };
  return { href: "/admin?tab=delivery&shipmentStatus=ALL", label: "Все отправления" };
}
