"use client";

import { useEffect, useState } from "react";

import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
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
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Не удалось рассмотреть заявку"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function refund(request: ReturnRequest) {
    if (busyId !== null) return;
    const amount = Number(refundAmounts[request.id]);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Укажите корректную сумму возврата");
      return;
    }
    if (request.requestedAmount && amount > request.requestedAmount) {
      setError("Сумма возврата не может быть больше суммы позиции");
      return;
    }

    setBusyId(request.id);
    setError(null);
    try {
      const updated = await refundAdminReturn(request.id, amount);
      setRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (refundError) {
      setError(
        refundError instanceof Error
          ? refundError.message
          : "Не удалось провести возврат денег"
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
              <label>
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

          {request.status === "INSPECTED" ||
          request.status === "REFUND_PENDING" ? (
            <div className={styles.review}>
              <label>
                <span>Сумма возврата</span>
                <input
                  inputMode="decimal"
                  value={refundAmounts[request.id] ?? ""}
                  onChange={(event) =>
                    setRefundAmounts((current) => ({
                      ...current,
                      [request.id]: event.target.value,
                    }))
                  }
                />
              </label>
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
                  Вернуть деньги
                </Button>
              </div>
            </div>
          ) : null}
        </article>
        ))}
        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    </OrderDetailSection>
  );
}
