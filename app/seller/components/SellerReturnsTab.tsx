"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ReturnInspectionForm } from "./ReturnInspectionForm";
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
  const searchParams = useSearchParams();
  const targetReturnId = Number(searchParams.get("returnId")) || null;
  const focusedReturnRef = useRef<number | null>(null);
  const [requests, setRequests] = useState<SellerReturnListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState<{ id: number; error: boolean; message: string } | null>(null);
  const actionInFlightRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadInitial() {
      let result = await getSellerReturns({ size: PAGE_SIZE, signal: controller.signal });
      const items = [...result.items];
      while (targetReturnId && !items.some(item => item.id === targetReturnId) && result.page + 1 < result.totalPages) {
        result = await getSellerReturns({ page: result.page + 1, size: PAGE_SIZE, signal: controller.signal });
        items.push(...result.items);
      }
      return { ...result, items };
    }
    void loadInitial()
      .then((result) => {
        if (controller.signal.aborted) return;
        setError(null);
        setRequests(result.items);
        setTotalItems(result.totalItems);
        setNextPage(result.page + 1);
        setHasMore(result.page + 1 < result.totalPages);
      })
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setLoadMoreFailed(false);
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
  }, [targetReturnId, attempt]);

  useEffect(() => {
    if (loading || !targetReturnId || focusedReturnRef.current === targetReturnId) return;
    const card = document.getElementById(`return-${targetReturnId}`);
    if (!card) return;
    focusedReturnRef.current = targetReturnId;
    card.scrollIntoView({ block: "center" });
    card.focus({ preventScroll: true });
  }, [loading, requests, targetReturnId]);

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
      if (controller.signal.aborted) return;
      setRequests((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [
          ...current,
          ...result.items.filter((item) => !existingIds.has(item.id)),
        ];
      });
      setTotalItems(result.totalItems);
      setNextPage(result.page + 1);
      setHasMore(result.page + 1 < result.totalPages);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setLoadMoreFailed(true);
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
    if (actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setBusyId(request.id);
    setFeedback(null);
    try {
      replaceRequest(await markSellerReturnReceived(request.id));
      setFeedback({ id: request.id, error: false, message: "Получение товара подтверждено" });
    } catch (actionError) {
      setFeedback({ id: request.id, error: true, message: actionError instanceof Error
          ? actionError.message
          : "Не удалось подтвердить получение"
      });
    } finally {
      actionInFlightRef.current = false;
      setBusyId(null);
    }
  }

  async function inspect(request: SellerReturnListItem, values: Parameters<typeof inspectSellerReturn>[1]) {
    if (actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setBusyId(request.id);
    setFeedback(null);
    try {
      replaceRequest(await inspectSellerReturn(request.id, values));
      setFeedback({ id: request.id, error: false, message: "Результат проверки сохранён" });
    } catch (actionError) {
      setFeedback({ id: request.id, error: true, message: actionError instanceof Error
          ? actionError.message
          : "Не удалось сохранить проверку"
      });
    } finally {
      actionInFlightRef.current = false;
      setBusyId(null);
    }
  }

  return (
    <section className={styles.page}>
      {loading ? <CabinetSkeleton variant="list" rows={3} compact /> : null}
      {!loading && !error && requests.length === 0 ? (
        <EmptyState
          icon="return-circle"
          title="У вас пока нет возвратов"
        />
      ) : null}

      {!loading && requests.length > 0 ? (
        <p className={styles.summary}>Всего возвратов: {totalItems}</p>
      ) : null}

      <div className={styles.list}>
        {requests.map((request) => (
          <article className={styles.card} key={request.id} id={`return-${request.id}`} tabIndex={-1}>
            <div className={styles.header}>
              <div>
                <strong>Возврат №{request.id}</strong>
                <span>
                  Заказ №{request.orderId}, {request.productTitle}
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
                  loading={busyId === request.id}
                  disabled={busyId !== null}
                  onClick={() => void markReceived(request)}
                >
                  Товар получен
                </Button>
              </div>
            ) : null}

            {request.status === "RECEIVED" ? (
              <ReturnInspectionForm request={request} loading={busyId === request.id}
                disabled={busyId !== null} onInspect={values => inspect(request, values)} />
            ) : null}
            {feedback?.id === request.id ? (
              <div className={`${feedback.error ? "alertDanger" : "alertSuccess"} ${styles.feedback}`}
                role={feedback.error ? "alert" : "status"}>{feedback.message}</div>
            ) : null}
          </article>
        ))}
      </div>

      {hasMore ? (
        <div className={styles.loadMore}>
          <Button
            variant="secondary"
            loading={loadingMore}
            onClick={() => void loadMore()}
          >
            Показать ещё
          </Button>
        </div>
      ) : null}

      {error ? <div className={`alertDanger ${styles.feedback}`} role="alert">
        <p>{error}</p>
        <Button onClick={() => {
          if (loadMoreFailed) { void loadMore(); return; }
          setError(null); setLoading(true); setAttempt(value => value + 1);
        }}>Повторить</Button>
      </div> : null}
    </section>
  );
}
