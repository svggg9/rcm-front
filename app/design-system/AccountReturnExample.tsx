"use client";

import { useState } from "react";
import { AccountReturnRequest } from "../account/components/AccountReturnRequest";
import { AccountReturnHistory } from "../account/components/AccountReturnsTab";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { ReturnSubmitError, type AccountReturnListItem, type ReturnRequest } from "../lib/returns";
import type { Order } from "../lib/order-contract";
import styles from "./AccountReturnExample.module.css";

type Scenario = "available" | "existing" | "unavailable" | "error" | "unknown";
const scenarios: { value: Scenario; label: string }[] = [
  { value: "available", label: "Доступен" },
  { value: "existing", label: "Уже оформлен" },
  { value: "unavailable", label: "Недоступен" },
  { value: "error", label: "Ошибка" },
  { value: "unknown", label: "Нет ответа" },
];
const createdAt = "2026-11-07T12:00:00Z";
const demoItem: Order["items"][number] = { productId: 1, variantId: 1, sellerId: 1, productPublicId: null,
  productTitle: "Рубашка из хлопка", brandName: "Пример бренда", imageUrl: "/examples/demo-shirt-front.svg",
  color: "Молочный", size: "M", quantity: 2, price: 5900, lineTotal: 11800, sku: "" };
const demoOrder: Order = {
  id: 1042, orderGroupId: "DEMO-1042", status: "COMPLETED", paymentStatus: "PAID", deliveryStatus: "DELIVERED",
  createdAt, currency: "RUB", items: [demoItem], subtotalAmount: 11800, deliveryAmount: 350, discountAmount: 0,
  totalAmount: 12150, deliveryAddress: null, deliveryMethod: "PICKUP_POINT", delivery: null, deliveryStatusChangedAt: null,
  recipientName: "Демонстрационный покупатель", recipientPhone: null, paidAt: createdAt, paymentAllowed: false,
  paymentDueAt: null, paymentMethod: "CARD", paymentReviewRequired: false, cancellationAllowed: false,
  cancellationAvailableUntil: null, cancellationRequestedAt: null, cancelledAt: null, unpaidCancellationPending: false,
  returnAvailableUntil: null, trackingNumber: null, pickupPointId: null, commissionAmount: null, commissionRate: null,
  deliveryCostAmount: null, deliverySubsidyAmount: null, fittingMode: null, platformNetAmount: null,
  workflow: { version: 1, audience: "BUYER", evaluatedAt: createdAt, events: [], actions: [
    { code: "REQUEST_RETURN", allowed: true, reason: null, reasonCode: null, scope: "ORDER", availableUntil: null },
  ] },
};

const existing: ReturnRequest = {
  id: 101, orderId: 1042, productId: 1, variantId: 1, productTitle: demoItem.productTitle, sku: "", quantity: 1,
  reason: "DOES_NOT_FIT", comment: null, status: "SUBMITTED", requestKey: null, requestedAmount: 5900,
  adminComment: null, approvedRefundAmount: null, barcodeAvailable: false, cdekNumber: null, courierDate: null,
  courierTimeFrom: null, courierTimeTo: null, photoUrls: [], resellable: null, sellerComment: null, trackingUrl: null,
  waybillAvailable: false, createdAt, updatedAt: createdAt,
  workflow: { version: 1, audience: "BUYER", evaluatedAt: createdAt, events: [{ code: "CREATED", occurredAt: createdAt }], actions: [] },
};
type HistoryState = "ready" | "empty" | "loading" | "error" | "refreshing" | "refresh-error";
const historyStates: { value: HistoryState; label: string }[] = [
  { value: "ready", label: "Есть возврат" }, { value: "empty", label: "Пусто" },
  { value: "loading", label: "Загрузка" }, { value: "error", label: "Ошибка" },
  { value: "refreshing", label: "Обновление" }, { value: "refresh-error", label: "Ошибка обновления" },
];
const historyItem: AccountReturnListItem = { ...existing, imageUrl: demoItem.imageUrl, manualDelivery: false };
const historyDetail: ReturnRequest = { ...existing, workflow: { ...existing.workflow!, actions: [
  { code: "DOWNLOAD_DOCUMENTS", allowed: true, reasonCode: null, reason: null },
] } };

export function AccountReturnExample() {
  const [scenario, setScenario] = useState<Scenario>("available");
  return <div className={styles.example}>
    <h3>История возвратов покупателя</h3>
    <p>Рабочий список возвратов со всеми основными состояниями и условными действиями</p>
    <HistoryDemo />
    <h3>Оформление возврата</h3>
    <p>Рабочая форма возврата покупателя с условным заказом. Отправка и обновление выполняются только в примере</p>
    <SegmentedControl items={scenarios} value={scenario} onChange={setScenario} ariaLabel="Состояние возврата в примере" />
    <ReturnDemo key={scenario} scenario={scenario} />
  </div>;
}

function HistoryDemo() {
  const [state, setState] = useState<HistoryState>("ready");
  const [details, setDetails] = useState<Record<number, ReturnRequest>>({});
  const [message, setMessage] = useState("");
  const hasData = state === "ready" || state === "refreshing" || state === "refresh-error";
  return <div className={styles.history}>
    <SegmentedControl items={historyStates} value={state} onChange={value => { setState(value); setDetails({}); setMessage(""); }} ariaLabel="Состояние истории возвратов" />
    <AccountReturnHistory items={hasData ? [historyItem] : []} loading={state === "loading" || state === "refreshing"}
      error={state === "error" || state === "refresh-error" ? "Не удалось загрузить возвраты" : null} loadingMore={false} total={hasData ? 1 : 0}
      details={details} detailLoading={null} downloading={null} onRetry={() => setState("ready")}
      onChoose={() => setMessage("Оформление можно проверить в примере ниже")}
      onOpenOrder={() => setMessage("Заказ открыт только в примере")}
      onLoadMore={() => {}} onLoadDetail={() => setDetails({ [existing.id]: historyDetail })}
      onDownload={() => setMessage("Документ показан только как действие — скачивание не выполняется")} />
    <p className={styles.note} role="status">{message || "Данные не запрашиваются и не изменяются"}</p>
  </div>;
}

function ReturnDemo({ scenario }: { scenario: Scenario }) {
  const [requests, setRequests] = useState<ReturnRequest[]>(() => scenario === "existing" ? [existing] : []);
  const [message, setMessage] = useState("");
  const order = scenario === "unavailable" ? { ...demoOrder, workflow: { ...demoOrder.workflow,
    actions: [{ ...demoOrder.workflow.actions[0], allowed: false, reasonCode: "RETURN_WINDOW_EXPIRED" as const, reason: "Срок возврата истёк" }] } } : demoOrder;
  return <>
    {scenario === "unavailable" && <p className={styles.note}>Срок возврата истёк, оформление недоступно</p>}
    {(scenario === "error" || scenario === "unknown") && <p className={styles.note}>
      При отправке будет показана {scenario === "error" ? "ошибка заявки" : "неопределённость результата"}
    </p>}
    <AccountReturnRequest order={order} existingReturns={requests} onCreated={request => { setRequests(current => [...current, request]); setMessage("Заявка создана только в примере"); }}
      onRefreshReturn={() => setMessage("Состояние обновлено только в примере")}
      submitReturn={async params => {
        if (scenario === "error") throw new ReturnSubmitError("Не удалось отправить заявку — попробуйте ещё раз", false);
        if (scenario === "unknown") throw new ReturnSubmitError("Не удалось получить ответ — проверьте результат или повторите отправку", true);
        return { ...existing, id: 102, quantity: params.quantity ?? 1, reason: params.reason, comment: params.comment,
          requestKey: params.requestKey ?? null, requestedAmount: (params.quantity ?? 1) * demoItem.price };
      }} />
    <p className={styles.note} role="status">{message || "Настоящий возврат не создаётся"}</p>
  </>;
}
