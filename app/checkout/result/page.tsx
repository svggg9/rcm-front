"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { API_URL, apiFetch } from "../../lib/api";

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

export default function CheckoutResultPage() {
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
        tone: "#555",
      };
    }

    if (payment.status === "SUCCEEDED") {
      return {
        title: "Оплата прошла успешно",
        text: "Заказ оплачен. Мы обновили статус заказов в группе.",
        tone: "#0a7a2f",
      };
    }

    if (payment.status === "PENDING") {
      return {
        title: "Платеж обрабатывается",
        text: "Банк еще не прислал финальный статус. Можно проверить еще раз.",
        tone: "#8a5a00",
      };
    }

    if (payment.status === "CANCELED") {
      return {
        title: "Оплата отменена",
        text: "Платеж был отменен. Можно попробовать оплатить снова.",
        tone: "#9a3412",
      };
    }

    return {
      title: "Оплата не прошла",
      text: "Платеж отклонен или завершился ошибкой. Можно попробовать еще раз.",
      tone: "#b00020",
    };
  }, [payment]);

  const loadResult = useCallback(
    async (syncFirst: boolean) => {
      if (!canLoad) {
        setError("Не найден orderGroupId в ссылке");
        setLoading(false);
        return;
      }

      setError(null);

      try {
        if (syncFirst && externalPaymentId) {
          const syncResponse = await apiFetch(
            `${API_URL}/api/payments/${encodeURIComponent(externalPaymentId)}/sync`,
            { method: "POST" }
          );

          if (!syncResponse.ok) {
            const text = await syncResponse.text().catch(() => "");
            throw new Error(text || `Ошибка синхронизации оплаты (${syncResponse.status})`);
          }
        }

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
    },
    [canLoad, externalPaymentId, orderGroupId]
  );

  useEffect(() => {
    void loadResult(true);
  }, [loadResult]);

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

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>Проверяем оплату…</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ ...styles.statusBadge, color: statusView.tone }}>
          {payment?.providerStatus || payment?.status || "UNKNOWN"}
        </div>

        <h1 style={styles.title}>{statusView.title}</h1>
        <p style={styles.text}>{statusView.text}</p>

        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={styles.metaBox}>
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
          <div style={styles.orders}>
            <h2 style={styles.subtitle}>Заказы в группе</h2>

            {orders.map((order) => (
              <div key={order.id} style={styles.orderRow}>
                <div>
                  <strong>Заказ #{order.id}</strong>
                  <div style={styles.muted}>
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

        <div style={styles.actions}>
          {payment?.status === "PENDING" ? (
            <button
              type="button"
              onClick={() => {
                setChecking(true);
                void loadResult(true);
              }}
              disabled={checking}
              style={styles.primaryBtn}
            >
              {checking ? "Проверяем…" : "Проверить снова"}
            </button>
          ) : null}

          {payment?.status === "FAILED" || payment?.status === "CANCELED" ? (
            <button
              type="button"
              onClick={retryPayment}
              disabled={checking}
              style={styles.primaryBtn}
            >
              {checking ? "Создаем платеж…" : "Попробовать оплатить снова"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => router.push("/account?tab=orders")}
            style={styles.secondaryBtn}
          >
            Перейти к заказам
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f7f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "720px",
    background: "#fff",
    border: "1px solid #e8e8e8",
    padding: "28px",
    boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
  },
  statusBadge: {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "10px",
  },
  title: {
    fontSize: "30px",
    lineHeight: 1.1,
    margin: "0 0 10px",
    color: "#111",
  },
  text: {
    color: "#555",
    margin: "0 0 20px",
    lineHeight: 1.5,
  },
  error: {
    border: "1px solid #ffd5d5",
    background: "#fff3f3",
    color: "#b00020",
    padding: "12px 14px",
    marginBottom: "18px",
  },
  metaBox: {
    border: "1px solid #efefef",
    background: "#fafafa",
    padding: "16px",
    display: "grid",
    gap: "8px",
    marginBottom: "20px",
    color: "#333",
    wordBreak: "break-all",
  },
  orders: {
    marginBottom: "20px",
  },
  subtitle: {
    fontSize: "18px",
    margin: "0 0 12px",
  },
  orderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    borderTop: "1px solid #eee",
    padding: "12px 0",
  },
  muted: {
    color: "#777",
    fontSize: "14px",
    marginTop: "4px",
  },
  actions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  primaryBtn: {
    border: "none",
    background: "#111",
    color: "#fff",
    padding: "13px 16px",
    fontSize: "15px",
    cursor: "pointer",
  },
  secondaryBtn: {
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    padding: "13px 16px",
    fontSize: "15px",
    cursor: "pointer",
  },
};