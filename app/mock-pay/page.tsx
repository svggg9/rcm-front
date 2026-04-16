"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { API_URL, apiFetch } from "../lib/api";

type PaymentResult = "SUCCEEDED" | "FAILED" | "CANCELED";

export default function MockPayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams.get("orderId") ?? "";
  const externalPaymentId = searchParams.get("externalPaymentId") ?? "";

  const [submitting, setSubmitting] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(orderId && externalPaymentId);
  }, [orderId, externalPaymentId]);

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
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка mock-оплаты (${response.status})`);
      }

      router.replace(`/account?tab=orders&orderId=${encodeURIComponent(orderId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось завершить mock-оплату");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f7f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "#fff",
          border: "1px solid #e8e8e8",
          padding: "24px",
          boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#666",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "8px",
            }}
          >
            Mock Payment
          </div>

          <h1
            style={{
              fontSize: "28px",
              lineHeight: 1.1,
              margin: 0,
              color: "#111",
            }}
          >
            Тестовая оплата заказа
          </h1>
        </div>

        <div
          style={{
            border: "1px solid #efefef",
            background: "#fafafa",
            padding: "16px",
            marginBottom: "18px",
          }}
        >
          <div style={{ marginBottom: "8px", color: "#333" }}>
            <strong>Заказ:</strong> #{orderId || "—"}
          </div>

          <div
            style={{
              color: "#555",
              wordBreak: "break-all",
              fontSize: "14px",
            }}
          >
            <strong>externalPaymentId:</strong>{" "}
            {externalPaymentId || "—"}
          </div>
        </div>

        {!canSubmit ? (
          <div
            style={{
              border: "1px solid #ffd5d5",
              background: "#fff3f3",
              color: "#b00020",
              padding: "12px 14px",
              marginBottom: "18px",
            }}
          >
            В ссылке не хватает <code>orderId</code> или{" "}
            <code>externalPaymentId</code>.
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <button
            type="button"
            onClick={() => void completePayment("SUCCEEDED")}
            disabled={!canSubmit || submitting !== null}
            style={{
              border: "none",
              background: "#111",
              color: "#fff",
              padding: "14px 16px",
              fontSize: "15px",
              cursor: canSubmit && submitting === null ? "pointer" : "default",
              opacity: !canSubmit || submitting !== null ? 0.65 : 1,
            }}
          >
            {submitting === "SUCCEEDED"
              ? "Подтверждаем оплату…"
              : "Оплатить успешно"}
          </button>

          <button
            type="button"
            onClick={() => void completePayment("FAILED")}
            disabled={!canSubmit || submitting !== null}
            style={{
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              padding: "14px 16px",
              fontSize: "15px",
              cursor: canSubmit && submitting === null ? "pointer" : "default",
              opacity: !canSubmit || submitting !== null ? 0.65 : 1,
            }}
          >
            {submitting === "FAILED"
              ? "Фиксируем ошибку…"
              : "Ошибка оплаты"}
          </button>

          <button
            type="button"
            onClick={() => void completePayment("CANCELED")}
            disabled={!canSubmit || submitting !== null}
            style={{
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              padding: "14px 16px",
              fontSize: "15px",
              cursor: canSubmit && submitting === null ? "pointer" : "default",
              opacity: !canSubmit || submitting !== null ? 0.65 : 1,
            }}
          >
            {submitting === "CANCELED"
              ? "Отменяем…"
              : "Отменить оплату"}
          </button>
        </div>

        {error ? (
          <div
            style={{
              border: "1px solid #ffd5d5",
              background: "#fff3f3",
              color: "#b00020",
              padding: "12px 14px",
              marginBottom: "18px",
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() =>
            router.push(
              orderId
                ? `/account?tab=orders&orderId=${encodeURIComponent(orderId)}`
                : "/account?tab=orders"
            )
          }
          style={{
            border: "none",
            background: "transparent",
            color: "#555",
            padding: 0,
            cursor: "pointer",
            textDecoration: "underline",
            fontSize: "14px",
          }}
        >
          Вернуться к заказам
        </button>
      </div>
    </div>
  );
}