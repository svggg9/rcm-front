"use client";

import { useOrderActions } from "../../lib/useOrderActions";
import { orderAction } from "../../lib/order-contract";
import { OrderWorkflowSummary } from "../../components/order-detail/OrderWorkflowSummary";
import { useEffect, useRef, useState } from "react";

import { useConfirmation } from "../../components/ui/ConfirmActionButton";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { RequestError } from "../../components/ui/RequestError";
import {
  OrderDetailField,
  OrderDetailFields,
  OrderDetailLayout,
  OrderDetailPanelFields,
  OrderDetailProductList,
  OrderDetailSection,
  OrderDetailSummary,
  orderDetailStyles,
} from "../../components/order-detail/OrderDetail";
import { formatCdekShipmentStatus } from "../../lib/delivery";
import { formatRussianPhone } from "../../lib/phone";

import type { AdminOrder } from "../types";
import { AdminReturnRequests } from "./AdminReturnRequests";

type Props = {
  order: AdminOrder;
  listHref?: string;
  refunding: boolean;
  deliveryCancelling: boolean;
  onRefund: () => Promise<void>;
  onCancelDelivery: () => Promise<void>;
  onRefresh: () => Promise<void>;
  formatOrderStatus: (status: AdminOrder["status"]) => string;
  formatPaymentStatus: (status: AdminOrder["paymentStatus"]) => string;
  formatDeliveryStatus: (status: AdminOrder["deliveryStatus"]) => string;
  buildStatusLabel: (order: AdminOrder) => string;
};

export function AdminOrderDetails({
  order,
  listHref = "/admin?tab=orders",
  refunding,
  deliveryCancelling,
  onRefund,
  onCancelDelivery,
  onRefresh,
  formatOrderStatus,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildStatusLabel,
}: Props) {
  const [queuedOrderId, setQueuedOrderId] = useState<number | null>(null);
  const queuedOrder = useRef<number | null>(null);
  const [recovery, setRecovery] = useState<{ snapshot: AdminOrder; message: string } | null>(null);
  const blockedSnapshot = useRef<AdminOrder | null>(null);
  const operation = useRef<{ orderId: number } | null>(null);
  const refreshing = useRef(false);
  const [pending, setPending] = useState(false);
  const [refreshPending, setRefreshPending] = useState(false);
  const latest = useRef({ order, refunding, deliveryCancelling, onRefund, onCancelDelivery, onRefresh });
  useEffect(() => {
    latest.current = { order, refunding, deliveryCancelling, onRefund, onCancelDelivery, onRefresh };
    if (blockedSnapshot.current && blockedSnapshot.current !== order) {
      blockedSnapshot.current = null;
      setRecovery(null);
    }
    if (operation.current && operation.current.orderId !== order.id) {
      operation.current = null;
      setPending(false);
    }
  }, [order, refunding, deliveryCancelling, onRefund, onCancelDelivery, onRefresh]);
  const {confirm,confirmation}=useConfirmation();
  const action = useOrderActions(order);
  const canRefund = action("REFUND").allowed && queuedOrderId !== order.id;
  const deliveryCancellationFinished = ["NOT_DELIVERED", "CANCELLED"].includes(
    order.delivery?.shipmentStatus ?? ""
  );
  const hasCancellationRequest = Boolean(order.cancellationRequestedAt);
  const cancellationPending = hasCancellationRequest && !deliveryCancellationFinished;
  const canCancelDelivery = action("CANCEL_DELIVERY").allowed;
  const commandsDisabled = pending || refunding || deliveryCancelling || refreshPending || recovery?.snapshot === order;

  function canSubmit(code: "REFUND" | "CANCEL_DELIVERY", snapshot: AdminOrder) {
    const current = latest.current;
    return current.order === snapshot && !current.refunding && !current.deliveryCancelling
      && !refreshing.current && blockedSnapshot.current !== snapshot
      && (code !== "REFUND" || queuedOrder.current !== snapshot.id)
      && orderAction(snapshot, code).allowed;
  }

  function requireRefresh(message: string) {
    if (latest.current.order.id !== order.id) return;
    const snapshot = latest.current.order;
    blockedSnapshot.current = snapshot;
    setRecovery({ snapshot, message });
  }

  async function submit(code: "REFUND" | "CANCEL_DELIVERY") {
    if (operation.current || !canSubmit(code, order)) return;
    const token = { orderId: order.id };
    operation.current = token;
    setPending(true);
    try {
      const confirmed = await confirm(code === "REFUND"
        ? { title: "Вернуть оплату", text: "Будет создан запрос в очереди возвратов. Завершение возврата фиксируется после подтверждения банка", label: "Создать запрос" }
        : { title: "Отменить доставку", text: "До приёма СДЭК накладная будет удалена, после приёма будет зарегистрирован отказ", label: "Отменить доставку" });
      if (!confirmed || operation.current !== token || !canSubmit(code, order)) return;
      await (code === "REFUND" ? latest.current.onRefund() : latest.current.onCancelDelivery());
      if (operation.current !== token) return;
      if (code === "REFUND") {
        queuedOrder.current = order.id;
        setQueuedOrderId(order.id);
        window.dispatchEvent(new Event("refund-operations-changed"));
      }
      // The parent may swallow a failed follow-up GET. Its resolved Promise is not a fresh snapshot.
      if (latest.current.order === order) requireRefresh("Действие принято — обновите заказ для проверки состояния");
    } catch {
      requireRefresh("Результат действия не подтверждён — обновите заказ перед повтором");
    } finally {
      if (operation.current === token) {
        operation.current = null;
        setPending(false);
      }
    }
  }

  async function refreshOrder() {
    if (operation.current || refreshing.current) return;
    refreshing.current = true;
    setRefreshPending(true);
    try {
      await latest.current.onRefresh();
    } catch {
      // Keep both commands blocked until a new order snapshot actually arrives.
    } finally {
      refreshing.current = false;
      setRefreshPending(false);
    }
  }

  return (
    <>{confirmation}<OrderDetailLayout
      breadcrumbs={[
        { href: "/admin", label: "Админка" },
        { href: listHref, label: "Заказы" },
        { label: `Заказ ${order.id}` },
      ]}
      title={`Заказ ${order.id}`}
      status={<StatusBadge tone={getOrderTone(order)}>{buildStatusLabel(order)}</StatusBadge>}
      meta={<span>{new Date(order.createdAt).toLocaleString("ru-RU")}</span>}
      main={
        <>
          <OrderDetailSection title="Товары">
            <OrderDetailProductList items={order.items} />
          </OrderDetailSection>

          <AdminReturnRequests orderId={order.id} />

          <OrderDetailSection title="Получатель" icon="info">
            <OrderDetailFields>
              <OrderDetailField label="ФИО" value={order.recipientName?.trim() || null} />
              <OrderDetailField
                label="Телефон"
                value={formatRussianPhone(order.recipientPhone)}
              />
            </OrderDetailFields>
          </OrderDetailSection>

          <OrderDetailSection title="Доставка" icon="address">
            <OrderDetailFields>
              <OrderDetailField label="Способ доставки" value={formatDeliveryMethod(order.deliveryMethod)} />
              <OrderDetailField label="Примерка" value={formatFittingMode(order.fittingMode)} />
              <OrderDetailField label="Адрес / ПВЗ" value={order.deliveryAddress} wide />

              {order.delivery?.cdekNumber ? (
                <OrderDetailField label="Номер СДЭК" value={order.delivery.cdekNumber} />
              ) : null}

              {order.delivery?.shipmentStatus ? (
                <OrderDetailField
                  label="Статус СДЭК"
                  value={formatCdekShipmentStatus(order.delivery.shipmentStatus)}
                />
              ) : null}

              {order.delivery?.trackingUrl ? (
                <OrderDetailField
                  label="Отследить"
                  value={
                    <a href={order.delivery.trackingUrl} target="_blank" rel="noreferrer">
                      Открыть трекинг
                    </a>
                  }
                />
              ) : null}

              {order.trackingNumber ? (
                <OrderDetailField label="Трек-номер" value={order.trackingNumber} />
              ) : null}
            </OrderDetailFields>
          </OrderDetailSection>
        </>
      }
      aside={
        <>
          <OrderDetailSection title="Информация" icon="check" panel>
            <OrderDetailPanelFields>
              <OrderDetailField label="Статус заказа" value={formatOrderStatus(order.status)} />
              <OrderDetailField label="Статус оплаты" value={formatPaymentStatus(order.paymentStatus)} />
              <OrderDetailField label="Статус доставки" value={formatDeliveryStatus(order.deliveryStatus)} />
            </OrderDetailPanelFields>
          </OrderDetailSection>

          <OrderDetailSection title="Сумма" panel>
            <OrderDetailSummary summary={order} />
          </OrderDetailSection>

          <OrderDetailSection title="Действия" panel>
            <div className={orderDetailStyles.actions}>
              <OrderWorkflowSummary workflow={order.workflow}/>
              {canRefund ? (
                <Button variant="danger" onClick={() => void submit("REFUND")} disabled={commandsDisabled} loading={refunding}>
                  Вернуть оплату
                </Button>
              ) : null}

              {canCancelDelivery ? (
                <Button
                  variant="secondary"
                  onClick={() => void submit("CANCEL_DELIVERY")}
                  disabled={commandsDisabled}
                >
                  Отменить доставку
                </Button>
              ) : null}

              {cancellationPending && order.delivery ? (
                <div className={orderDetailStyles.actionLink}>Отмена доставки оформляется</div>
              ) : null}

              {order.paymentStatus === "REFUNDED" ? (
                <div className={orderDetailStyles.actionLink}>Оплата возвращена</div>
              ) : null}

              {queuedOrderId === order.id && order.paymentStatus !== "REFUNDED" ? <p role="status">Запрос возврата создан. Проверьте отправку и подтверждение в очереди возвратов</p> : null}
              {recovery?.snapshot === order ? <RequestError variant="inline" message={recovery.message}
                text="Проверьте текущее состояние заказа и очередь возвратов"
                loading={refreshPending} disabled={pending || refunding || deliveryCancelling} onRetry={refreshOrder} /> : null}
            </div>
          </OrderDetailSection>
        </>
      }
    /></>
  );
}

function formatDeliveryMethod(value: string | null) {
  if (value === "COURIER") return "Курьер";
  if (value === "PICKUP_POINT" || value === "PICKUP") return "ПВЗ СДЭК";
  return value;
}

function formatFittingMode(value?: string | null) {
  if (value === "WITH_FITTING") return "С примеркой";
  if (value === "WITHOUT_FITTING") return "Без примерки";
  return null;
}

function getOrderTone(order: AdminOrder) {
  if (
    order.status === "CANCELED" ||
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "REFUNDED" ||
    order.deliveryStatus === "RETURNED" ||
    order.deliveryStatus === "CANCELLED"
  ) {
    return "danger";
  }

  if (order.paymentStatus === "PENDING") return "warning";

  return "success";
}
