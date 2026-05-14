"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { API_URL, apiFetch } from "../../lib/api";
import styles from "./CheckoutResult.module.css";

type PaymentStatus = "PENDING" | "SUCCEEDED" | "CANCELED" | "FAILED";

type PaymentResponse = {
  id: number;
  externalId: string;
  orderId: number;
  orderGroupId: string;
  provider: string;
  status: PaymentStatus;
  providerStatus?: string | null;
  amount: number;
  currency: string;
  confirmationUrl?: string | null;
  returnUrl?: string | null;
  paidAt?: string | null;
  canceledAt?: string | null;
};

type OrderResponse = {
  id: number;
  orderGroupId: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
};

function CheckoutResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderGroupId = searchParams.get("orderGroupId") ?? "";
  const externalPaymentId = searchParams.get("externalPaymentId") ?? "";

  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoad = Boolean(orderGroupId);

  const statusView = useMemo(() => {
    if (!payment) {
      return {
        title: "Проверяем оплату",
        text: "Получаем актуальный статус платежа.",
        toneClass: styles.neutral,
      };
    }

    if (payment.status === "SUCCEEDED") {
      return {
        title: "Оплата прошла успешно",
        text: "Заказ оплачен. Мы обновили статус заказов в группе.",
        toneClass: styles.success,
      };
    }

    if (payment.status === "PENDING") {
      return {
        title: "Платеж обрабатывается",
        text: "Банк еще не прислал финальный статус. Страница обновит данные автоматически.",
        toneClass: styles.pending,
      };
    }

    if (payment.status === "CANCELED") {
      return {
        title: "Оплата отменена",
        text: "Платеж был отменен. Можно попробовать оплатить снова.",
        toneClass: styles.canceled,
      };
    }

    return {
      title: "Оплата не прошла",
      text: "Платеж отклонен или завершился ошибкой. Можно попробовать еще раз.",
      toneClass: styles.failed,
    };
  }, [payment]);

  const loadResult = useCallback(async () => {
    if (!canLoad) {
      setError("Не найден orderGroupId в ссылке");
      setLoading(false);
      return;
    }

    setError(null);

    try {
      const [paymentResponse, ordersResponse] = await Promise.all([
        apiFetch(`${API_URL}/api/payments/group/${encodeURIComponent(orderGroupId)}/last`),
        apiFetch(`${API_URL}/api/orders/group/${encodeURIComponent(orderGroupId)}`),
      ]);

      if (!paymentResponse.ok) {
        const text = await paymentResponse.text().catch(() => "");
        throw new Error(text || `Не удалось загрузить платеж (${paymentResponse.status})`);
      }

      if (!ordersResponse.ok) {
        const text = await ordersResponse.text().catch(() => "");
        throw new Error(text || `Не удалось загрузить заказы (${ordersResponse.status})`);
      }

      const paymentData = (await paymentResponse.json()) as PaymentResponse;
      const ordersData = (await ordersResponse.json()) as OrderResponse[];

      setPayment(paymentData);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось проверить оплату");
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, [canLoad, orderGroupId]);

  useEffect(() => {
    void loadResult();

    const interval = setInterval(() => {
      if (payment?.status === "PENDING") {
        void loadResult();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loadResult, payment?.status]);

  async function retryPayment() {
    if (!orderGroupId) return;

    setChecking(true);
    setError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/payments/group/${encodeURIComponent(orderGroupId)}`,
        { method: "POST" }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Не удалось создать платеж (${response.status})`);
      }

      const data = await response.json();

      if (!data.confirmationUrl) {
        throw new Error("Backend не вернул ссылку на оплату");
      }

      window.location.href = data.confirmationUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось повторить оплату");
      setChecking(false);
    }
  }

  async function debugSyncPayment() {
    const paymentIdForSync = externalPaymentId || payment?.externalId;

    if (!paymentIdForSync) {
      setError("Не найден PaymentId для синхронизации");
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/payments/${encodeURIComponent(paymentIdForSync)}/sync`,
        { method: "POST" }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка синхронизации оплаты (${response.status})`);
      }

      await loadResult();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось синхронизировать оплату");
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Проверяем оплату…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.statusBadge} ${statusView.toneClass}`}>
          {payment?.providerStatus || payment?.status || "UNKNOWN"}
        </div>

        <h1 className={styles.title}>{statusView.title}</h1>
        <p className={styles.text}>{statusView.text}</p>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.metaBox}>
          <div>
            <strong>Группа заказа:</strong> {orderGroupId || "—"}
          </div>
          <div>
            <strong>Платеж:</strong> {payment?.externalId || externalPaymentId || "—"}
          </div>
          <div>
            <strong>Статус:</strong> {payment?.status || "—"}
          </div>
          <div>
            <strong>Провайдер:</strong> {payment?.provider || "—"}
          </div>
          {payment ? (
            <div>
              <strong>Сумма:</strong> {Number(payment.amount).toLocaleString()} {payment.currency}
            </div>
          ) : null}
        </div>

        {orders.length > 0 ? (
          <div className={styles.orders}>
            <h2 className={styles.subtitle}>Заказы в группе</h2>

            {orders.map((order) => (
              <div key={order.id} className={styles.orderRow}>
                <div>
                  <strong>Заказ #{order.id}</strong>
                  <div className={styles.muted}>
                    {order.status} / {order.paymentStatus}
                  </div>
                </div>

                <div>
                  {Number(order.totalAmount).toLocaleString()} {order.currency}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className={styles.actions}>
          {payment?.status === "PENDING" ? (
            <button
              type="button"
              onClick={() => {
                setChecking(true);
                void loadResult();
              }}
              disabled={checking}
              className={styles.primaryBtn}
            >
              {checking ? "Проверяем…" : "Проверить снова"}
            </button>
          ) : null}

          {payment?.status === "FAILED" || payment?.status === "CANCELED" ? (
            <button
              type="button"
              onClick={retryPayment}
              disabled={checking}
              className={styles.primaryBtn}
            >
              {checking ? "Создаем платеж…" : "Попробовать оплатить снова"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => router.push("/account?tab=orders")}
            className={styles.secondaryBtn}
          >
            Перейти к заказам
          </button>

          {process.env.NODE_ENV !== "production" ? (
            <button
              type="button"
              onClick={debugSyncPayment}
              disabled={checking}
              className={styles.debugBtn}
            >
              {checking ? "Синхронизируем…" : "DEBUG SYNC"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <div className={styles.card}>Загружаем результат оплаты…</div>
        </div>
      }
    >
      <CheckoutResultContent />
    </Suspense>
  );
}