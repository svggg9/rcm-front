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
import { API_URL, apiFetch } from "../../lib/api";

import type { Order } from "../types";

type Props = {
  order: Order;
  onBack: () => void;
  formatOrderStatus: (status: Order["status"]) => string;
  formatPaymentStatus: (status: Order["paymentStatus"]) => string;
  formatDeliveryStatus: (status: Order["deliveryStatus"]) => string;
  buildOrderStatusLabel: (order: Order) => string;
};

export function AccountOrderDetails({
  order,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildOrderStatusLabel,
}: Props) {
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const canPay = order.status === "NEW" && order.paymentStatus === "PENDING";

  async function handlePay() {
    if (!canPay || paying) return;

    setPaying(true);
    setPayError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/payments/group/${encodeURIComponent(order.orderGroupId)}`,
        { method: "POST" }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка создания оплаты (${response.status})`);
      }

      const data: { confirmationUrl?: string } = await response.json();

      if (!data.confirmationUrl) {
        throw new Error("Не пришла ссылка на оплату");
      }

      window.location.href = data.confirmationUrl;
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Не удалось перейти к оплате");
    } finally {
      setPaying(false);
    }
  }

  return (
    <OrderDetailLayout
      breadcrumbs={[
        { href: "/account?tab=profile", label: "Профиль" },
        { href: "/account?tab=orders", label: "Заказы" },
        { label: `Заказ ${order.id}` },
      ]}
      title={`Заказ ${order.id}`}
      status={
        <StatusBadge tone={getOrderTone(order)}>
          {buildOrderStatusLabel(order)}
        </StatusBadge>
      }
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
              <OrderDetailField label="Статус оплаты" value={formatPaymentStatus(order.paymentStatus)} />
              <OrderDetailField label="Статус доставки" value={formatDeliveryStatus(order.deliveryStatus)} />
            </OrderDetailPanelFields>
          </OrderDetailSection>

          <OrderDetailSection title="Сумма" panel>
            <OrderDetailSummary summary={order} />
          </OrderDetailSection>

          {canPay ? (
            <OrderDetailSection panel>
              <div className={orderDetailStyles.actions}>
                <Button
                  variant="primary"
                  onClick={() => void handlePay()}
                  disabled={paying}
                >
                  {paying ? "Переходим к оплате..." : "Оплатить"}
                </Button>

                {payError ? <div className={orderDetailStyles.payError}>{payError}</div> : null}
              </div>
            </OrderDetailSection>
          ) : null}
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

function getOrderTone(order: Order) {
  if (
    order.status === "CANCELED" ||
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "CANCELED"
  ) {
    return "danger";
  }

  if (order.paymentStatus === "PENDING") return "warning";
  if (order.status === "COMPLETED" || order.deliveryStatus === "DELIVERED") {
    return "success";
  }

  return "default";
}
