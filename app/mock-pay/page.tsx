"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { API_URL, apiFetch } from "../lib/api";

type PaymentResult = "CONFIRMED" | "REJECTED" | "CANCELED";

function MockPayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams.get("orderId") ?? "";
  const orderGroupId = searchParams.get("orderGroupId") ?? "";
  const externalPaymentId = searchParams.get("externalPaymentId") ?? "";

  const [submitting, setSubmitting] = useState<PaymentResult | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(orderId && orderGroupId && externalPaymentId);
  }, [orderId, orderGroupId, externalPaymentId]);

  useEffect(() => {
    if (!externalPaymentId) return;

    let active = true;

    async function markFormShowed() {
      try {
        setOpening(true);

        const response = await apiFetch(
          `${API_URL}/api/mock-payments/${encodeURIComponent(externalPaymentId)}/form-showed`,
          { method: "POST" }
        );

        if (!response.ok && active) {
          const text = await response.text().catch(() => "");
          setError(text || `Не удалось открыть mock-форму (${response.status})`);
        }
      } finally {
        if (active) {
          setOpening(false);
        }
      }
    }

    void markFormShowed();

    return () => {
      active = false;
    };
  }, [externalPaymentId]);

  async function completePayment(result: PaymentResult) {
    if (!canSubmit) {
      setError("Не хватает параметров mock-оплаты");
      return;
    }

    setSubmitting(result);
    setError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/mock-payments/${encodeURIComponent(
          externalPaymentId
        )}/complete?result=${encodeURIComponent(result)}`,
        { method: "POST" }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка mock-оплаты (${response.status})`);
      }

      router.replace(
        `/checkout/result?orderGroupId=${encodeURIComponent(
          orderGroupId
        )}&externalPaymentId=${encodeURIComponent(externalPaymentId)}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось завершить mock-оплату");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.kicker}>Mock T-Bank Payment Page</div>

        <h1 style={styles.title}>Тестовая страница оплаты</h1>

        <p style={styles.text}>
          Это mock-страница, которая имитирует hosted payment page банка.
          В боевом режиме здесь будет страница Т-Банка.
        </p>

        <div style={styles.metaBox}>
          <div>
            <strong>Заказ:</strong> #{orderId || "—"}
          </div>
          <div>
            <strong>Группа:</strong> {orderGroupId || "—"}
          </div>
          <div>
            <strong>PaymentId:</strong> {externalPaymentId || "—"}
          </div>
          <div>
            <strong>Provider status:</strong>{" "}
            {opening ? "FORM_SHOWED..." : "FORM_SHOWED"}
          </div>
        </div>

        {!canSubmit ? (
          <div style={styles.error}>
            В ссылке не хватает <code>orderId</code>, <code>orderGroupId</code> или{" "}
            <code>externalPaymentId</code>.
          </div>
        ) : null}

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => void completePayment("CONFIRMED")}
            disabled={!canSubmit || submitting !== null}
            style={styles.primaryBtn}
          >
            {submitting === "CONFIRMED" ? "Подтверждаем…" : "Оплатить успешно"}
          </button>

          <button
            type="button"
            onClick={() => void completePayment("REJECTED")}
            disabled={!canSubmit || submitting !== null}
            style={styles.secondaryBtn}
          >
            {submitting === "REJECTED" ? "Отклоняем…" : "Ошибка оплаты"}
          </button>

          <button
            type="button"
            onClick={() => void completePayment("CANCELED")}
            disabled={!canSubmit || submitting !== null}
            style={styles.secondaryBtn}
          >
            {submitting === "CANCELED" ? "Отменяем…" : "Отменить оплату"}
          </button>
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}

        <button
          type="button"
          onClick={() =>
            orderGroupId
              ? router.push(
                  `/checkout/result?orderGroupId=${encodeURIComponent(
                    orderGroupId
                  )}&externalPaymentId=${encodeURIComponent(externalPaymentId)}`
                )
              : router.push("/account?tab=orders")
          }
          style={styles.linkBtn}
        >
          Вернуться без оплаты
        </button>
      </div>
    </div>
  );
}

export default function MockPayPage() {
  return (
    <Suspense fallback={null}>
      <MockPayPageContent />
    </Suspense>
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
    maxWidth: "560px",
    background: "#fff",
    border: "1px solid #e8e8e8",
    padding: "24px",
    boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
  },
  kicker: {
    fontSize: "12px",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "8px",
  },
  title: {
    fontSize: "28px",
    lineHeight: 1.1,
    margin: "0 0 10px",
    color: "#111",
  },
  text: {
    margin: "0 0 18px",
    color: "#555",
    lineHeight: 1.5,
  },
  metaBox: {
    border: "1px solid #efefef",
    background: "#fafafa",
    padding: "16px",
    marginBottom: "18px",
    display: "grid",
    gap: "8px",
    color: "#333",
    wordBreak: "break-all",
  },
  actions: {
    display: "grid",
    gap: "12px",
    marginBottom: "18px",
  },
  primaryBtn: {
    border: "none",
    background: "#111",
    color: "#fff",
    padding: "14px 16px",
    fontSize: "15px",
    cursor: "pointer",
  },
  secondaryBtn: {
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    padding: "14px 16px",
    fontSize: "15px",
    cursor: "pointer",
  },
  error: {
    border: "1px solid #ffd5d5",
    background: "#fff3f3",
    color: "#b00020",
    padding: "12px 14px",
    marginBottom: "18px",
  },
  linkBtn: {
    border: "none",
    background: "transparent",
    color: "#555",
    padding: 0,
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "14px",
  },
};