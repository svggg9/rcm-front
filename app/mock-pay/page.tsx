"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { API_URL, apiFetch } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Banner } from "../components/ui/Banner";

type PaymentResult = "CONFIRMED" | "REJECTED" | "CANCELED";

function MockPayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams.get("orderId") ?? "";
  const externalPaymentId = searchParams.get("externalPaymentId") ?? "";

  const [submitting, setSubmitting] = useState<PaymentResult | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(orderId && externalPaymentId);
  }, [orderId, externalPaymentId]);

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

      router.replace(`/account?tab=orders&orderId=${encodeURIComponent(orderId)}`);
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
            <strong>PaymentId:</strong> {externalPaymentId || "—"}
          </div>
          <div>
            <strong>Provider status:</strong>{" "}
            {opening ? "FORM_SHOWED..." : "FORM_SHOWED"}
          </div>
        </div>

        {!canSubmit ? (
          <div style={styles.error}>
            В ссылке не хватает <code>orderId</code> или <code>externalPaymentId</code>.
          </div>
        ) : null}

        <div style={styles.actions}>
          <Button
            type="button"
            variant="primary"
            onClick={() => void completePayment("CONFIRMED")}
            disabled={!canSubmit || submitting !== null}
            loading={submitting === "CONFIRMED"}
          >
            Оплатить успешно
          </Button>

          <Button
            type="button"
            onClick={() => void completePayment("REJECTED")}
            disabled={!canSubmit || submitting !== null}
            loading={submitting === "REJECTED"}
          >
            Ошибка оплаты
          </Button>

          <Button
            type="button"
            onClick={() => void completePayment("CANCELED")}
            disabled={!canSubmit || submitting !== null}
            loading={submitting === "CANCELED"}
          >
            Отменить оплату
          </Button>
        </div>

        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Button
          type="button"
          variant="utility"
          size="compact"
          onClick={() =>
            orderId ? router.push(`/account?tab=orders&orderId=${encodeURIComponent(orderId)}`) : router.push("/account?tab=orders")
          }
        >
          Вернуться без оплаты
        </Button>
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
    background: "var(--soft)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    background: "var(--white)",
    border: "var(--line-width-default) solid var(--line)",
    padding: "24px",
    boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
  },
  kicker: {
    fontSize: "var(--font-helper)",
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "8px",
  },
  title: {
    fontSize: "var(--font-title-lg)",
    lineHeight: 1.1,
    margin: "0 0 10px",
    color: "var(--black)",
  },
  text: {
    margin: "0 0 18px",
    color: "var(--text)",
    lineHeight: 1.5,
  },
  metaBox: {
    border: "var(--line-width-default) solid var(--line)",
    background: "var(--soft)",
    padding: "16px",
    marginBottom: "18px",
    display: "grid",
    gap: "8px",
    color: "var(--text)",
    wordBreak: "break-all",
  },
  actions: {
    display: "grid",
    gap: "12px",
    marginBottom: "18px",
  },
};
