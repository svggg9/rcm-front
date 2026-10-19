"use client";

import { NumericField } from "../../components/ui/NumericField";
import { useFieldValidation } from "../../lib/useFieldValidation";
import { scrollToFirstValidationError } from "../../lib/formValidation";
import { MONEY_RULES, parseNumericInput } from "../../lib/numericInput";

import { useEffect, useState } from "react";

import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { toast } from "../../components/ui/toast";
import { OrderDetailSection } from "../../components/order-detail/OrderDetail";
import {
  getAdminOrderReturns,
  refundAdminReturn,
  returnReasonLabels,
  returnStatusLabels,
  reviewAdminReturn,
  type ReturnRequest,
} from "../../lib/returns";
import styles from "./AdminReturnRequests.module.css";

type Props = {
  orderId: number;
};

export function AdminReturnRequests({ orderId }: Props) {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [refundAmounts, setRefundAmounts] = useState<Record<number, string>>({});
  function validateAmounts(values: Record<number, string>) {
    const errors: Record<number, string> = {};
    for (const request of requests) {
      if (request.status !== "INSPECTED" || request.refundId) continue;
      const amount = parseNumericInput(values[request.id] ?? "", MONEY_RULES);
      if (amount === null || !Number.isFinite(amount) || amount <= 0) errors[request.id] = "Укажите корректную сумму возврата";
      else if (request.requestedAmount && amount > request.requestedAmount) errors[request.id] = "Сумма возврата не может быть больше суммы позиции";
    }
    return errors;
  }
  const amountValidation = useFieldValidation(refundAmounts, validateAmounts);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAdminOrderReturns(orderId)
      .then((items) => {
        if (!cancelled) {
          setRequests(items);
          setRefundAmounts(
            Object.fromEntries(
              items.map((item) => [
                item.id,
                String(item.approvedRefundAmount ?? item.requestedAmount ?? ""),
              ])
            )
          );
        }
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (document.hidden || busyId !== null || pending) return;
      pending = true;
      try { const items = await getAdminOrderReturns(orderId); if (active) setRequests(items); }
      catch { /* Keep loaded requests on a temporary polling failure. */ }
      finally { pending = false; }
    };
    const timer = setInterval(() => void refresh(), 15000);
    window.addEventListener("refund-operations-changed", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("refund-operations-changed", refresh); };
  }, [orderId, busyId]);

  async function review(
    request: ReturnRequest,
    decision: "approve" | "reject"
  ) {
    if (busyId) return;
    if (decision === "reject" && !comments[request.id]?.trim()) {
      setError("Для отклонения укажите причину");
      return;
    }

    setBusyId(request.id);
    setError(null);
    try {
      const updated = await reviewAdminReturn(
        request.id,
        decision,
        comments[request.id]
      );
      setRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success(`Возврат №${updated.id}: ${returnStatusLabels[updated.status]}`, {
        id: `admin-return-request-${request.id}`, description: undefined, action: undefined,
      });
    } catch (reviewError) {
      toast.error(
        reviewError instanceof Error
          ? reviewError.message
          : "Не удалось рассмотреть заявку",
        { id: `admin-return-request-${request.id}` }
      );
    } finally {
      setBusyId(null);
    }
  }

  async function refund(request: ReturnRequest) {
    if (busyId !== null) return;
    amountValidation.touch(request.id);
    const amount = parseNumericInput(refundAmounts[request.id] ?? "", MONEY_RULES);
    if (validateAmounts(refundAmounts)[request.id] || amount === null) {
      setError(null);
      scrollToFirstValidationError({ selector: '#refund-amount-' + request.id + '[aria-invalid="true"]' });
      return;
    }

    setBusyId(request.id);
    setError(null);
    try {
      const updated = await refundAdminReturn(request.id, amount);
      window.dispatchEvent(new Event("refund-operations-changed"));
      setRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success(`Возврат №${updated.id}: ${returnStatusLabels[updated.status]}`, {
        id: `admin-return-request-${request.id}`, description: undefined, action: undefined,
      });
    } catch (refundError) {
      toast.error(
        refundError instanceof Error
          ? refundError.message
          : "Не удалось провести возврат денег",
        { id: `admin-return-request-${request.id}` }
      );
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <OrderDetailSection title="Возвраты">
      <div className={styles.list}>
        {requests.map((request) => (
        <article key={request.id} className={styles.card}>
          <div className={styles.header}>
            <div>
              <strong>Возврат №{request.id}</strong>
              <span>{request.productTitle}</span>
            </div>
            <StatusBadge
              tone={
                request.status === "REJECTED"
                  ? "danger"
                  : request.status === "SUBMITTED" ||
                      request.status === "REQUESTED"
                    ? "warning"
                    : "success"
              }
            >
              {returnStatusLabels[request.status]}
            </StatusBadge>
          </div>

          <dl>
            <div>
              <dt>Причина</dt>
              <dd>{returnReasonLabels[request.reason]}</dd>
            </div>
            <div>
              <dt>Количество</dt>
              <dd>{request.quantity}</dd>
            </div>
          </dl>

          {request.comment ? <p>{request.comment}</p> : null}

          {request.photoUrls.length > 0 ? (
            <div className={styles.photos}>
              {request.photoUrls.map((url, index) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  Фото {index + 1}
                </a>
              ))}
            </div>
          ) : null}

          {request.status === "SUBMITTED" ||
          request.status === "REQUESTED" ? (
            <div className={styles.review}>
              <label data-ui="field">
                <span>Комментарий администратора</span>
                <textarea
                  value={comments[request.id] ?? ""}
                  onChange={(event) =>
                    setComments((current) => ({
                      ...current,
                      [request.id]: event.target.value,
                    }))
                  }
                  maxLength={1000}
                />
              </label>
              <div className={styles.actions}>
                <Button
                  variant="primary"
                  onClick={() => void review(request, "approve")}
                  disabled={busyId === request.id}
                >
                  Одобрить
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void review(request, "reject")}
                  disabled={busyId === request.id}
                >
                  Отклонить
                </Button>
              </div>
            </div>
          ) : null}

          {request.status === "INSPECTED" && !request.refundId ? (
            <div className={styles.review}>
              <NumericField label="Сумма возврата" {...MONEY_RULES}
                  id={"refund-amount-" + request.id} error={amountValidation.errors[request.id]}
                  onBlur={() => amountValidation.touch(request.id)}
                  value={refundAmounts[request.id] ?? ""}
                  onChange={(event) =>
                    setRefundAmounts((current) => ({
                      ...current,
                      [request.id]: event.target.value,
                    }))
                  }
                />
              <div className={styles.actions}>
                {request.requestedAmount ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setRefundAmounts((current) => ({
                        ...current,
                        [request.id]: String(request.requestedAmount),
                      }))
                    }
                    disabled={busyId === request.id}
                  >
                    Полная сумма
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onClick={() => void refund(request)}
                  disabled={busyId === request.id}
                >
                  Создать запрос возврата
                </Button>
              </div>
            </div>
          ) : null}
          {request.status === "REFUND_PENDING" ? <p role="status">Запрос возврата создан. Проверьте отправку и подтверждение в очереди возвратов{request.refundId ? `: №${request.refundId}` : ""}</p> : null}
        </article>
        ))}
        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    </OrderDetailSection>
  );
}
