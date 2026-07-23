"use client";

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
import { API_URL } from "../../lib/api";
import { formatCdekShipmentStatus } from "../../lib/delivery";
import { formatRussianPhone } from "../../lib/phone";

import type { SellerOrder } from "../types";

type Props = {
  order: SellerOrder;
  formatOrderStatus: (status: SellerOrder["status"]) => string;
  formatPaymentStatus: (status: SellerOrder["paymentStatus"]) => string;
  formatDeliveryStatus: (status: SellerOrder["deliveryStatus"]) => string;
  buildSellerStatusLabel: (order: SellerOrder) => string;
};

export function SellerOrderDetails({
  order,
  formatOrderStatus,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildSellerStatusLabel,
}: Props) {
  const labelHref = `${API_URL}/api/seller/orders/${order.id}/delivery-label`;

  return (
    <OrderDetailLayout
      breadcrumbs={[
        { href: "/seller", label: "Кабинет продавца" },
        { href: "/seller?tab=orders", label: "Заказы" },
        { label: `Заказ ${order.id}` },
      ]}
      title={`Заказ ${order.id}`}
      status={
        <StatusBadge tone={getOrderTone(order)}>
          {buildSellerStatusLabel(order)}
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
              <OrderDetailField
                label="Телефон"
                value={formatRussianPhone(order.recipientPhone)}
              />
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

          {order.delivery ? (
            <OrderDetailSection title="Документы" panel>
              <div className={orderDetailStyles.actions}>
                <a
                  href={labelHref}
                  className={orderDetailStyles.actionLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Скачать накладную СДЭК
                </a>
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

function formatFittingMode(value?: string | null) {
  if (value === "WITH_FITTING") return "С примеркой";
  if (value === "WITHOUT_FITTING") return "Без примерки";
  return null;
}

function getOrderTone(order: SellerOrder) {
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
