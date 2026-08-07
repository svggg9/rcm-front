"use client";

import { useEffect, useRef, useState } from "react";

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
  type SellerReturnListItem,
} from "../../lib/returns";
import styles from "./SellerReturnsTab.module.css";

const PAGE_SIZE = 20;

export function SellerReturnsTab() {
  const [requests, setRequests] = useState<SellerReturnListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [resellable, setResellable] = useState<Record<number, boolean>>({});
  const loadingMoreRef = useRef(false);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getSellerReturns({ size: PAGE_SIZE, signal: controller.signal })
      .then((result) => {
        setRequests(result.items);
        setTotalItems(result.totalItems);
        setNextPage(result.page + 1);
        setHasMore(result.page + 1 < result.totalPages);
        setAmounts(
          Object.fromEntries(
            result.items.map((item) => [
              item.id,
              String(item.approvedRefundAmount ?? item.requestedAmount ?? ""),
            ])
          )
        );
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить возвраты"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      loadMoreControllerRef.current?.abort();
    };
  }, []);

  async function loadMore() {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    try {
      const result = await getSellerReturns({
        page: nextPage,
        size: PAGE_SIZE,
        signal: controller.signal,
      });
      setRequests((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [
          ...current,
          ...result.items.filter((item) => !existingIds.has(item.id)),
        ];
      });
      setAmounts((current) => ({
        ...current,
        ...Object.fromEntries(
          result.items.map((item) => [
            item.id,
            String(item.approvedRefundAmount ?? item.requestedAmount ?? ""),
          ])
        ),
      }));
      setTotalItems(result.totalItems);
      setNextPage(result.page + 1);
      setHasMore(result.page + 1 < result.totalPages);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить возвраты"
      );
    } finally {
      loadingMoreRef.current = false;
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
      }
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  function replaceRequest(updated: SellerReturnListItem) {
    setRequests((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  async function markReceived(request: SellerReturnListItem) {
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

  async function inspect(request: SellerReturnListItem) {
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
      {!loading && !error && requests.length === 0 ? (
        <EmptyState
          icon="return-circle"
          tone="gold"
          title="У вас пока нет возвратов"
          text="Новые заявки покупателей появятся здесь."
        />
      ) : null}

      {!loading && requests.length > 0 ? (
        <p className={styles.summary}>Всего возвратов: {totalItems}</p>
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

      {hasMore ? (
        <div className={styles.loadMore}>
          <Button
            variant="secondary"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? "Загружаем…" : "Показать ещё"}
          </Button>
        </div>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}
    </section>
  );
}
