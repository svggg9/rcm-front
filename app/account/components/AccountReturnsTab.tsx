"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import {
  getAccountReturns,
  returnReasonLabels,
  returnStatusLabels,
  type AccountReturnListItem,
} from "../../lib/returns";
import styles from "./AccountReturnsTab.module.css";

type Props = {
  onOpenOrders: () => void;
};

export function AccountReturnsTab({ onOpenOrders }: Props) {
  const [returns, setReturns] = useState<AccountReturnListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void getAccountReturns({ signal: controller.signal })
      .then((result) => {
        setReturns(result.items);
        setNextPage(result.page + 1);
        setTotalItems(result.totalItems);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function loadMore() {
    if (loadingMoreRef.current || returns.length >= totalItems) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(false);
    try {
      const result = await getAccountReturns({ page: nextPage });
      setReturns((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...result.items.filter((item) => !ids.has(item.id))];
      });
      setNextPage(result.page + 1);
      setTotalItems(result.totalItems);
    } catch {
      setError(true);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <p>
          Здесь вы можете проверить статус возврата и распечатать документы для
          отправки товара через ПВЗ СДЭК.
        </p>
      </div>

      {error ? (
        <div className={styles.error}>Не удалось загрузить возвраты.</div>
      ) : null}

      {!loading && !error && returns.length === 0 ? (
        <div className={styles.empty}>
          <strong>У вас пока нет возвратов</strong>
          <p>Оставить заявку на возврат можно во вкладке «Заказы».</p>
          <Button variant="secondary" onClick={onOpenOrders}>
            Посмотреть заказы
          </Button>
        </div>
      ) : null}

      {loading ? <CabinetSkeleton variant="list" rows={3} compact /> : null}

      {returns.length > 0 ? (
        <>
          <div className={styles.list}>
            {returns.map((request) => (
            <article key={request.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <span>Возврат №{request.id}</span>
                  <strong>{request.productTitle}</strong>
                </div>
                <span>{returnStatusLabels[request.status]}</span>
              </div>
              <dl>
                <div>
                  <dt>Причина</dt>
                  <dd>{returnReasonLabels[request.reason]}</dd>
                </div>
                <div>
                  <dt>Заказ</dt>
                  <dd>№{request.orderId}</dd>
                </div>
                {request.cdekNumber ? (
                  <div>
                    <dt>Номер СДЭК</dt>
                    <dd>{request.cdekNumber}</dd>
                  </div>
                ) : null}
              </dl>
              {request.trackingUrl ? (
                <a href={request.trackingUrl} target="_blank" rel="noreferrer">
                  Отследить возврат
                </a>
              ) : null}
            </article>
            ))}
          </div>
          <ListLoadMore
            loaded={returns.length}
            total={totalItems}
            loading={loadingMore}
            onLoadMore={() => void loadMore()}
          />
        </>
      ) : null}
    </section>
  );
}
