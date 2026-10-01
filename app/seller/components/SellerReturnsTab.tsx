"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import linkedRow from "../../components/ui/LinkedListRow.module.css";

import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  getSellerReturns,
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
  const [error, setError] = useState<string | null>(null);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const loadingMoreRef = useRef(false);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getSellerReturns({ size: PAGE_SIZE, signal: controller.signal })
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
  }, [attempt]);

  useEffect(() => {
    const changed = (event: Event) => {
      const updated = (event as CustomEvent<SellerReturnListItem>).detail;
      setRequests(current => current.map(item => item.id === updated.id ? updated : item));
    };
    window.addEventListener("seller-return-updated", changed);
    return () => window.removeEventListener("seller-return-updated", changed);
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
          <article className={`${styles.card} ${linkedRow.row}`} key={request.id} id={`return-${request.id}`} tabIndex={-1}>
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

            <Link href={`/seller/returns/${request.id}`} scroll={false} prefetch={false} className={`buttonSecondary ${styles.openLink} ${linkedRow.link}`}
              aria-label={`Открыть возврат №${request.id}`}>Открыть возврат</Link>
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
