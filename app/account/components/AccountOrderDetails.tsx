"use client";

import { useEffect, useState } from "react";

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
import { formatCdekShipmentStatus } from "../../lib/delivery";
import { formatRussianPhone } from "../../lib/phone";
import {
  getOrderReturns,
  type ReturnRequest,
} from "../../lib/returns";

import type { Order } from "../types";
import { AccountReturnRequest } from "./AccountReturnRequest";

type Props = {
  order: Order;
  onBack: () => void;
  onOrderUpdated: (order: Order) => void;
  formatOrderStatus: (status: Order["status"]) => string;
  formatPaymentStatus: (status: Order["paymentStatus"]) => string;
  formatDeliveryStatus: (status: Order["deliveryStatus"]) => string;
  buildOrderStatusLabel: (order: Order) => string;
};

export function AccountOrderDetails({
  order,
  onOrderUpdated,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildOrderStatusLabel,
}: Props) {
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [cancellationWindowOpen, setCancellationWindowOpen] = useState(() =>
    isCancellationWindowOpen(order.cancellationAvailableUntil)
  );

  const canPay = order.status === "NEW" && order.paymentStatus === "PENDING";
  const canCancel =
    order.cancellationAllowed &&
    cancellationWindowOpen &&
    !order.cancellationRequestedAt;
  const cancellationPending =
    Boolean(order.cancellationRequestedAt) &&
    order.paymentStatus !== "REFUNDED" &&
    order.status !== "CANCELED";
  const returnsAvailable =
    order.paymentStatus === "PAID" &&
    (order.status === "COMPLETED" || order.deliveryStatus === "DELIVERED");

  useEffect(() => {
    let cancelled = false;
    void getOrderReturns(order.id)
      .then((items) => {
        if (!cancelled) setReturns(items);
      })
      .catch(() => {
        if (!cancelled) setReturns([]);
      });
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  useEffect(() => {
    const deadline = order.cancellationAvailableUntil
      ? new Date(order.cancellationAvailableUntil).getTime()
      : Number.NaN;
    const remaining = deadline - Date.now();

    setCancellationWindowOpen(Number.isFinite(deadline) && remaining > 0);
    if (!Number.isFinite(deadline) || remaining <= 0) return;

    const timeout = window.setTimeout(
      () => setCancellationWindowOpen(false),
      Math.min(remaining, 2_147_483_647)
    );
    return () => window.clearTimeout(timeout);
  }, [order.cancellationAvailableUntil]);

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
    } catch (error) {
      setPayError(error instanceof Error ? error.message : "Не удалось перейти к оплате");
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    if (!canCancel || cancelling) return;

    setCancelling(true);
    setCancellationError(null);

    try {
      const response = await apiFetch(`${API_URL}/api/orders/${order.id}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Не удалось отменить заказ"));
      }

      const updatedOrder = (await response.json()) as Order;
      onOrderUpdated(updatedOrder);
      setConfirmCancellation(false);
    } catch (error) {
      setCancellationError(
        error instanceof Error ? error.message : "Не удалось отменить заказ"
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <OrderDetailLayout
      breadcrumbs={[
        { href: "/account", label: "Профиль" },
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

          {returnsAvailable || returns.length > 0 ? (
            <OrderDetailSection title="Возврат">
              <AccountReturnRequest
                order={order}
                existingReturns={returns}
                onCreated={(request) =>
                  setReturns((current) => [request, ...current])
                }
              />
            </OrderDetailSection>
          ) : null}

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
              <OrderDetailField
                label="Способ доставки"
                value={formatDeliveryMethod(order.deliveryMethod)}
              />
              <OrderDetailField
                label="Примерка"
                value={formatFittingMode(order.fittingMode)}
              />
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
              <OrderDetailField
                label="Статус оплаты"
                value={formatPaymentStatus(order.paymentStatus)}
              />
              <OrderDetailField
                label="Статус доставки"
                value={formatDeliveryStatus(order.deliveryStatus)}
              />
            </OrderDetailPanelFields>
          </OrderDetailSection>

          <OrderDetailSection title="Сумма" panel>
            <OrderDetailSummary summary={order} />
          </OrderDetailSection>

          {canPay || canCancel || cancellationPending ? (
            <OrderDetailSection panel>
              <div className={orderDetailStyles.actions}>
                {canPay ? (
                  <Button
                    variant="primary"
                    onClick={() => void handlePay()}
                    disabled={paying}
                  >
                    Оплатить
                  </Button>
                ) : null}

                {cancellationPending ? (
                  <div className={orderDetailStyles.cancellationStatus}>
                    <strong>Отмена оформляется</strong>
                    <span>Деньги вернутся тем же способом оплаты</span>
                  </div>
                ) : null}

                {canCancel && !confirmCancellation ? (
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmCancellation(true)}
                  >
                    Отменить заказ
                  </Button>
                ) : null}

                {canCancel && confirmCancellation ? (
                  <div className={orderDetailStyles.cancellationConfirm}>
                    <strong>Отменить заказ?</strong>
                    <span>Деньги вернутся тем же способом оплаты</span>
                    <div className={orderDetailStyles.confirmActions}>
                      <Button
                        variant="danger"
                        onClick={() => void handleCancel()}
                        disabled={cancelling}
                      >
                        Да, отменить
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmCancellation(false)}
                        disabled={cancelling}
                      >
                        Не отменять
                      </Button>
                    </div>
                  </div>
                ) : null}

                {payError ? (
                  <div className={orderDetailStyles.payError}>{payError}</div>
                ) : null}
                {cancellationError ? (
                  <div className={orderDetailStyles.payError}>{cancellationError}</div>
                ) : null}
              </div>
            </OrderDetailSection>
          ) : null}
        </>
      }
    />
  );
}

async function readApiError(response: Response, fallback: string) {
  const text = await response.text().catch(() => "");
  if (!text) return fallback;

  try {
    const data = JSON.parse(text) as { message?: string };
    if (data.message?.includes("self-service cancellation period has expired")) {
      return "Время самостоятельной отмены истекло";
    }
    return data.message?.trim() || fallback;
  } catch {
    return text;
  }
}

function isCancellationWindowOpen(value: string | null) {
  if (!value) return false;
  const deadline = new Date(value).getTime();
  return Number.isFinite(deadline) && deadline > Date.now();
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

function getOrderTone(order: Order) {
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
