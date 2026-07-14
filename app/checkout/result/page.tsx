"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { StatusBadge, type StatusBadgeTone } from "../../components/ui/StatusBadge";
import { API_URL, apiFetch } from "../../lib/api";
import { productPath } from "../../lib/productUrls";
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

type OrderItem = {
  productId: number;
  productPublicId?: string | null;
  productTitle: string;
  size?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  quantity: number;
};

type OrderResponse = {
  id: number;
  items?: OrderItem[];
};

function formatPaymentStatus(status?: string | null): string {
  switch (status) {
    case "SUCCEEDED":
    case "PAID":
      return "Оплачено";
    case "PENDING":
      return "Ожидает оплаты";
    case "CANCELED":
      return "Отменено";
    case "FAILED":
      return "Ошибка оплаты";
    default:
      return "Проверяем";
  }
}

function getPaymentTone(status?: PaymentStatus | null): StatusBadgeTone {
  if (status === "SUCCEEDED") return "success";
  if (status === "PENDING") return "warning";
  if (status === "CANCELED" || status === "FAILED") return "danger";
  return "default";
}

export function CheckoutResultContent({ orderId: routeOrderId }: { orderId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = routeOrderId ?? searchParams.get("orderId") ?? "";
  const externalPaymentId = searchParams.get("externalPaymentId") ?? "";

  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoad = Boolean(orderId);

  const statusView = useMemo(() => {
    if (!payment) {
      return {
        title: "Проверяем оплату",
        text: "Получаем актуальный статус платежа",
      };
    }

    if (payment.status === "SUCCEEDED") {
      return {
        title: "Оплата прошла успешно",
        text: "Заказ оплачен, мы начали обработку",
      };
    }

    if (payment.status === "PENDING") {
      return {
        title: "Платеж обрабатывается",
        text: "Банк еще не прислал финальный статус, страница обновится автоматически",
      };
    }

    if (payment.status === "CANCELED") {
      return {
        title: "Оплата отменена",
        text: "Платеж отменен, можно попробовать оплатить снова",
      };
    }

    return {
      title: "Оплата не прошла",
      text: "Платеж отклонен или завершился ошибкой, можно попробовать еще раз",
    };
  }, [payment]);

  const orderItems = useMemo(
    () => orders.flatMap((order) => order.items || []),
    [orders]
  );

  const loadResult = useCallback(async () => {
    if (!canLoad) {
      setError("Не найден номер заказа в ссылке");
      setLoading(false);
      return;
    }

    setError(null);

    try {
      const [paymentResponse, ordersResponse] = await Promise.all([
        apiFetch(`${API_URL}/api/payments/order/${encodeURIComponent(orderId)}/group-last`),
        apiFetch(`${API_URL}/api/orders/${encodeURIComponent(orderId)}/group`),
      ]);

      if (!paymentResponse.ok) {
        const text = await paymentResponse.text().catch(() => "");
        throw new Error(text || `Не удалось загрузить платеж (${paymentResponse.status})`);
      }

      if (!ordersResponse.ok) {
        const text = await ordersResponse.text().catch(() => "");
        throw new Error(text || `Не удалось загрузить заказ (${ordersResponse.status})`);
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
  }, [canLoad, orderId]);

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
    const paymentOrderId = orderId || payment?.orderId?.toString();
    if (!paymentOrderId) return;

    setChecking(true);
    setError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/payments/order/${encodeURIComponent(paymentOrderId)}/group`,
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
    return null;
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroHeader}>
            <StatusBadge tone={getPaymentTone(payment?.status)}>
              {formatPaymentStatus(payment?.status)}
            </StatusBadge>
          </div>

          <h1 className={`${styles.title} textPageTitle`}>{statusView.title}</h1>
          <p className={`${styles.text} textBody`}>{statusView.text}</p>

          {error ? <div className={`${styles.error} textSmall`}>{error}</div> : null}

          <div className={styles.actions}>
            {payment?.status === "PENDING" ? (
              <button
                type="button"
                onClick={() => {
                  setChecking(true);
                  void loadResult();
                }}
                disabled={checking}
                className="buttonPrimary textButton"
              >
                Проверить снова
              </button>
            ) : null}

            {payment?.status === "FAILED" || payment?.status === "CANCELED" ? (
              <button
                type="button"
                onClick={retryPayment}
                disabled={checking}
                className="buttonPrimary textButton"
              >
                Оплатить снова
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => router.push("/account?tab=orders")}
              className="buttonSecondary textButton"
            >
              Перейти к заказам
            </button>

            {process.env.NODE_ENV !== "production" ? (
              <button
                type="button"
                onClick={debugSyncPayment}
                disabled={checking}
                className="buttonSecondary textButton"
              >
                Синхронизировать
              </button>
            ) : null}
          </div>
        </section>

        {orderItems.length > 0 ? (
          <section className={styles.contents}>
            <h2 className={`${styles.sectionTitle} textTitle`}>Состав заказа</h2>

            <div className={styles.productList}>
              {orderItems.map((item, index) => (
                <Link
                  key={`${item.productId}-${index}`}
                  href={productPath({
                    id: item.productId,
                    publicId: item.productPublicId,
                    title: item.productTitle,
                  })}
                  className={styles.product}
                >
                  <div className={styles.productImageWrap}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        width={96}
                        height={120}
                        className={styles.productImage}
                      />
                    ) : (
                      <div className={styles.productImagePlaceholder} />
                    )}
                  </div>

                  <div className={styles.productInfo}>
                    <div className={`${styles.productTitle} textBody`}>
                      {item.productTitle}
                    </div>
                    {item.size || item.color ? (
                      <div className={`${styles.productMeta} textSmall`}>
                        {[item.size, item.color].filter(Boolean).join(" · ")}
                      </div>
                    ) : null}
                  </div>

                  <div className={`${styles.productQuantity} textSmall`}>
                    × {item.quantity}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutResultContent />
    </Suspense>
  );
}
