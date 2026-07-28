"use client";

import { useEffect, useState } from "react";

import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  getSellerReturns,
  inspectSellerReturn,
  markSellerReturnReceived,
  returnReasonLabels,
  returnStatusLabels,
  type ReturnRequest,
} from "../../lib/returns";
import styles from "./SellerReturnsTab.module.css";

export function SellerReturnsTab() {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [resellable, setResellable] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    void getSellerReturns()
      .then((items) => {
        if (cancelled) return;
        setRequests(items);
        setAmounts(
          Object.fromEntries(
            items.map((item) => [
              item.id,
              String(item.approvedRefundAmount ?? item.requestedAmount ?? ""),
            ])
          )
        );
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить возвраты"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function replaceRequest(updated: ReturnRequest) {
    setRequests((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  async function markReceived(request: ReturnRequest) {
    if (busyId !== null) return;
    setBusyId(request.id);
    setError(null);
    try {
      replaceRequest(await markSellerReturnReceived(request.id));
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Не удалось подтвердить получение"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function inspect(request: ReturnRequest) {
    if (busyId !== null) return;
    const amount = Number(amounts[request.id]);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Укажите корректную сумму возврата");
      return;
    }

    setBusyId(request.id);
    setError(null);
    try {
      replaceRequest(
        await inspectSellerReturn(request.id, {
          resellable: resellable[request.id] ?? true,
          acceptedRefundAmount: amount,
          comment: comments[request.id] ?? "",
        })
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Не удалось сохранить проверку"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.page}>
      {loading ? <CabinetSkeleton variant="list" rows={3} compact /> : null}
      {!loading && requests.length === 0 ? (
        <EmptyState
          icon="return-circle"
          tone="gold"
          title="У вас пока нет возвратов"
          text="Новые заявки покупателей появятся здесь."
        />
      ) : null}

      <div className={styles.list}>
        {requests.map((request) => (
          <article className={styles.card} key={request.id}>
            <div className={styles.header}>
              <div>
                <strong>Возврат №{request.id}</strong>
                <span>
                  Заказ №{request.orderId} · {request.productTitle}
                </span>
              </div>
              <StatusBadge
                tone={
                  request.status === "REJECTED"
                    ? "danger"
                    : request.status === "REQUESTED" ||
                        request.status === "SUBMITTED"
                      ? "warning"
                      : "success"
                }
              >
                {returnStatusLabels[request.status]}
              </StatusBadge>
            </div>

            <dl className={styles.details}>
              <div>
                <dt>Причина</dt>
                <dd>{returnReasonLabels[request.reason]}</dd>
              </div>
              <div>
                <dt>Количество</dt>
                <dd>{request.quantity}</dd>
              </div>
              {request.cdekNumber ? (
                <div>
                  <dt>Накладная СДЭК</dt>
                  <dd>{request.cdekNumber}</dd>
                </div>
              ) : null}
            </dl>

            {request.comment ? <p className={styles.comment}>{request.comment}</p> : null}

            {["APPROVED", "AWAITING_SHIPMENT", "WAITING_FOR_ITEM", "IN_TRANSIT"].includes(
              request.status
            ) ? (
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  disabled={busyId === request.id}
                  onClick={() => void markReceived(request)}
                >
                  Товар получен
                </Button>
              </div>
            ) : null}

            {request.status === "RECEIVED" ? (
              <div className={styles.inspection}>
                <label>
                  <span>Состояние товара</span>
                  <select
                    value={(resellable[request.id] ?? true) ? "yes" : "no"}
                    onChange={(event) =>
                      setResellable((current) => ({
                        ...current,
                        [request.id]: event.target.value === "yes",
                      }))
                    }
                  >
                    <option value="yes">Можно вернуть в продажу</option>
                    <option value="no">Нельзя вернуть в продажу</option>
                  </select>
                </label>
                <label>
                  <span>Сумма к возврату</span>
                  <input
                    inputMode="decimal"
                    value={amounts[request.id] ?? ""}
                    onChange={(event) =>
                      setAmounts((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.fullWidth}>
                  <span>Комментарий по проверке</span>
                  <textarea
                    maxLength={1000}
                    value={comments[request.id] ?? ""}
                    onChange={(event) =>
                      setComments((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className={`${styles.actions} ${styles.fullWidth}`}>
                  <Button
                    variant="primary"
                    disabled={busyId === request.id}
                    onClick={() => void inspect(request)}
                  >
                    Завершить проверку
                  </Button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
    </section>
  );
}
