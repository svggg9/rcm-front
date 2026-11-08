import { AdminOperationAlerts } from "../admin/components/AdminOperationAlerts";
import type { AdminOperationAlertPage } from "../admin/lib/adminOperationAlerts";

const example: AdminOperationAlertPage = {
  summary: { payments: 1, refunds: 1, deliveries: 1 },
  number: 0, size: 10, totalElements: 3, totalPages: 1,
  content: [
    { kind: "payment", reason: "PAYMENT_REVIEW", level: "review", orderId: 101, operationId: null, status: "PENDING", referenceAt: "2026-11-07T10:00:00+03:00" },
    { kind: "refund", reason: "REFUND_SENDING_STALE", level: "waiting", orderId: 102, operationId: 12, status: "PENDING", referenceAt: "2026-11-07T09:00:00+03:00" },
    { kind: "delivery", reason: "DELIVERY_FAILED", level: "error", orderId: 103, operationId: 18, status: "FAILED", referenceAt: "2026-11-07T08:00:00+03:00" },
  ],
};

export function AdminOperationAlertsPreview() {
  return <AdminOperationAlerts sample={example} />;
}
