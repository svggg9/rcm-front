"use client";

import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
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
  refunding: boolean;
  deliveryCancelling: boolean;
  onRefund: () => Promise<void>;
  onCancelDelivery: () => Promise<void>;
  formatOrderStatus: (status: AdminOrder["status"]) => string;
  formatPaymentStatus: (status: AdminOrder["paymentStatus"]) => string;
  formatDeliveryStatus: (status: AdminOrder["deliveryStatus"]) => string;
  buildStatusLabel: (order: AdminOrder) => string;
};

export function AdminOrderDetails({
  order,
  refunding,
  deliveryCancelling,
  onRefund,
  onCancelDelivery,
  formatOrderStatus,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildStatusLabel,
}: Props) {
  const [refundError, setRefundError] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const canRefund = order.paymentStatus === "PAID";
  const deliveryCancellationFinished = ["NOT_DELIVERED", "CANCELLED"].includes(
    order.delivery?.shipmentStatus ?? ""
  );
  const hasCancellationRequest = Boolean(order.cancellationRequestedAt);
  const cancellationPending = hasCancellationRequest && !deliveryCancellationFinished;
  const canCancelDelivery =
    Boolean(order.delivery) &&
    !hasCancellationRequest &&
    !["DELIVERED", "NOT_DELIVERED", "CANCELLED"].includes(
      order.delivery?.shipmentStatus ?? ""
    );

  async function handleRefund() {
    if (!canRefund || refunding) return;

    const confirmed = window.confirm(
      "Вернуть оплату по этому заказу? Это действие отправит возврат в платежный провайдер."
    );

    if (!confirmed) return;

    setRefundError(null);

    try {
      await onRefund();
    } catch (e) {
      setRefundError(e instanceof Error ? e.message : "Не удалось вернуть оплату");
    }
  }

  async function handleCancelDelivery() {
    if (!canCancelDelivery || deliveryCancelling) return;

    const confirmed = window.confirm(
      "Отменить доставку? До приема СДЭК накладная будет удалена, после приема будет зарегистрирован отказ."
    );
    if (!confirmed) return;

    setDeliveryError(null);
    try {
      await onCancelDelivery();
    } catch (e) {
      setDeliveryError(e instanceof Error ? e.message : "Не удалось отменить доставку");
    }
  }

  return (
    <OrderDetailLayout
      breadcrumbs={[
        { href: "/admin", label: "Админка" },
        { href: "/admin?tab=orders", label: "Заказы" },
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
              {canRefund ? (
                <Button variant="danger" onClick={() => void handleRefund()} disabled={refunding}>
                  {refunding ? "Возвращаем..." : "Вернуть оплату"}
                </Button>
              ) : null}

              {canCancelDelivery ? (
                <Button
                  variant="secondary"
                  onClick={() => void handleCancelDelivery()}
                  disabled={deliveryCancelling}
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

              {refundError ? <div className={orderDetailStyles.payError}>{refundError}</div> : null}
              {deliveryError ? <div className={orderDetailStyles.payError}>{deliveryError}</div> : null}
            </div>
          </OrderDetailSection>
        </>
      }
    />
  );
}

function formatDeliveryMethod(value: string) {
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
    order.paymentStatus === "CANCELED" ||
    order.paymentStatus === "REFUNDED" ||
    order.deliveryStatus === "RETURNED" ||
    order.deliveryStatus === "CANCELLED"
  ) {
    return "danger";
  }

  if (order.paymentStatus === "PENDING") return "warning";

  return "success";
}
