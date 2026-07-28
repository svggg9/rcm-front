"use client";

import { useEffect, useState } from "react";

import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import {
  getAccountReturns,
  returnReasonLabels,
  returnStatusLabels,
  type ReturnRequest,
} from "../../lib/returns";
import styles from "./AccountReturnsTab.module.css";

type Props = {
  onOpenOrders: () => void;
};

export function AccountReturnsTab({ onOpenOrders }: Props) {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getAccountReturns()
      .then((items) => {
        if (!cancelled) setReturns(items);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      ) : null}
    </section>
  );
}
