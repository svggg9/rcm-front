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

import type { AdminOrder } from "../types";

type Props = {
  order: AdminOrder;
  refunding: boolean;
  onRefund: () => Promise<void>;
  formatOrderStatus: (status: AdminOrder["status"]) => string;
  formatPaymentStatus: (status: AdminOrder["paymentStatus"]) => string;
  formatDeliveryStatus: (status: AdminOrder["deliveryStatus"]) => string;
  buildStatusLabel: (order: AdminOrder) => string;
};

export function AdminOrderDetails({
  order,
  refunding,
  onRefund,
  formatOrderStatus,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildStatusLabel,
}: Props) {
  const [refundError, setRefundError] = useState<string | null>(null);
  const canRefund = order.paymentStatus === "PAID";

  async function handleRefund() {
    if (!canRefund || refunding) return;

    const confirmed = window.confirm(
      "Вернуть оплату по всей группе заказа? Это действие отправит возврат в платежный провайдер."
    );

    if (!confirmed) return;

    setRefundError(null);

    try {
      await onRefund();
    } catch (e) {
      setRefundError(e instanceof Error ? e.message : "Не удалось вернуть оплату");
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

          <OrderDetailSection title="Получатель">
            <OrderDetailFields>
              <OrderDetailField label="ФИО" value={order.recipientName?.trim() || null} />
              <OrderDetailField label="Телефон" value={order.recipientPhone} />
            </OrderDetailFields>
          </OrderDetailSection>

          <OrderDetailSection title="Доставка">
            <OrderDetailFields>
              <OrderDetailField label="Способ доставки" value={formatDeliveryMethod(order.deliveryMethod)} />
              <OrderDetailField label="Примерка" value={formatFittingMode(order.fittingMode)} />
              <OrderDetailField label="Адрес / ПВЗ" value={order.deliveryAddress} wide />

              {order.delivery?.cdekNumber ? (
                <OrderDetailField label="Номер СДЭК" value={order.delivery.cdekNumber} />
              ) : null}

              {order.delivery?.shipmentStatus ? (
                <OrderDetailField label="Статус СДЭК" value={order.delivery.shipmentStatus} />
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
          <OrderDetailSection title="Информация" panel>
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

              {order.paymentStatus === "REFUNDED" ? (
                <div className={orderDetailStyles.actionLink}>Оплата возвращена</div>
              ) : null}

              {refundError ? <div className={orderDetailStyles.payError}>{refundError}</div> : null}
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
    order.deliveryStatus === "RETURNED" ||
    order.deliveryStatus === "CANCELLED"
  ) {
    return "danger";
  }

  if (order.paymentStatus === "PENDING") return "warning";

  if (order.paymentStatus === "REFUNDED") return "default";

  if (
    order.deliveryStatus === "READY_FOR_SHIPMENT" ||
    order.deliveryStatus === "READY_FOR_PICKUP"
  ) {
    return "warning";
  }

  if (order.status === "COMPLETED" || order.deliveryStatus === "DELIVERED") {
    return "success";
  }

  return "default";
}
