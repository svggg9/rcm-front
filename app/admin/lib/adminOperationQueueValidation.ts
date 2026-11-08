import type { OperationPage, RefundOperation } from "./paymentOperations";

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const id = (value: unknown): value is number => count(value) && value > 0;
const textOrNull = (value: unknown) => value === null || typeof value === "string";
const dateOrNull = (value: unknown) => value === null || typeof value === "string" && !Number.isNaN(Date.parse(value));
const page = (value: unknown, expected: number): value is Record<string, unknown> & { content: unknown[] } =>
  record(value) && Array.isArray(value.content) && value.number === expected && count(value.totalElements)
  && count(value.totalPages) && value.content.length <= 20 && value.totalElements >= value.content.length;

export function isPaymentReviewPage(value: unknown, expected: number): boolean {
  return page(value, expected) && value.content.every(row => record(row) && id(row.orderId)
    && typeof row.orderGroupId === "string" && row.orderGroupId.trim().length > 0
    && typeof row.status === "string" && row.status.length > 0
    && typeof row.paymentStatus === "string" && row.paymentStatus.length > 0
    && dateOrNull(row.paymentDueAt) && dateOrNull(row.reservationReleasedAt)
    && typeof row.initializationPending === "boolean" && typeof row.initializationRecoverable === "boolean"
    && (row.latePaymentId === null || id(row.latePaymentId)));
}

export function isRefundOperation(value: unknown): value is RefundOperation {
  return record(value) && id(value.id) && id(value.paymentId)
    && typeof value.amount === "number" && Number.isFinite(value.amount) && value.amount > 0
    && typeof value.currency === "string" && /^[A-Z]{3}$/.test(value.currency)
    && typeof value.status === "string" && ["PENDING", "SUCCEEDED", "CANCELED"].includes(value.status)
    && typeof value.dispatchState === "string" && ["READY", "SENDING", "RETRY", "ACKNOWLEDGED", "REVIEW"].includes(value.dispatchState)
    && count(value.dispatchAttempts) && textOrNull(value.requestReference) && textOrNull(value.externalId)
    && textOrNull(value.failureReason) && (value.orderId === null || id(value.orderId))
    && dateOrNull(value.dispatchedAt) && dateOrNull(value.nextDispatchAt);
}

export function isRefundOperationPage(value: unknown, expected: number): value is OperationPage<RefundOperation> {
  return page(value, expected) && value.content.every(isRefundOperation);
}
