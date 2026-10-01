"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import styles from "./AdminPaymentReview.module.css";

type Review = {
  orderId: number; orderGroupId: string; status: string; paymentStatus: string;
  paymentDueAt: string | null; reservationReleasedAt: string | null;
  initializationPending: boolean; latePaymentId: number | null;
};
type Page = { content: Review[]; number: number; totalPages: number; totalElements: number };

export function AdminPaymentReview({ onOpenOrder }: { onOpenOrder: (id: number) => void }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    void apiFetch(`${API_URL}/api/admin/payment-review?page=${page}&size=20`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Не удалось загрузить очередь проверки оплат");
        const result = await response.json() as Page;
        if (!controller.signal.aborted) setData(result);
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Ошибка загрузки"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);

  async function act(row: Review, refund: boolean) {
    if (busy) return;
    if (refund && !window.confirm(`Вернуть позднюю оплату по заказу №${row.orderId}?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const path = refund ? `${row.orderId}/late-refund` : `${encodeURIComponent(row.orderGroupId)}/reconcile`;
      const response = await apiFetch(`${API_URL}/api/admin/payment-review/${path}`, { method: "POST" });
      if (!response.ok) throw new Error(refund ? "Не удалось создать возврат. Проверьте текущие платежи и возвраты заказа" : "Не удалось проверить оплату");
      setMessage(refund ? "Запрос возврата создан. Дождитесь подтверждения провайдера" : "Сверка выполнена. Неразрешённые случаи остаются в очереди");
      reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Ошибка операции"); }
    finally { setBusy(false); }
  }

  return <section className={styles.panel} aria-label="Проверка оплат">
    <div className={styles.heading}><h2>Оплаты, требующие проверки{data ? ` · ${data.totalElements}` : ""}</h2>
      <Button variant="ghost" onClick={reload} disabled={loading || busy}>Обновить</Button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {loading && <p role="status">Загрузка…</p>}
    {data?.content.map(row => <div className={styles.row} key={row.orderId}>
      <button className={styles.order} onClick={() => onOpenOrder(row.orderId)}>Заказ №{row.orderId}</button>
      <span>{row.latePaymentId ? "Поздняя оплата" : row.initializationPending ? "Не подтверждено создание платежа" : !row.paymentDueAt ? "Проверка старого резерва" : "Сверка оплаты или отмены"}</span>
      <span>{row.reservationReleasedAt ? "Резерв освобождён" : "Резерв требует проверки"}</span>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={() => void act(row, false)} disabled={busy}>Проверить</Button>
        {row.latePaymentId && <Button variant="secondary" onClick={() => void act(row, true)} disabled={busy}>Вернуть оплату</Button>}
      </div>
    </div>)}
    {data && !data.content.length && !loading && <p>Нет оплат, требующих проверки</p>}
    {data && data.totalPages > 1 && <div className={styles.actions}>
      <Button variant="ghost" disabled={page === 0 || loading || busy} onClick={() => setPage(value => value - 1)}>Назад</Button>
      <span>Страница {page + 1} из {data.totalPages}</span>
      <Button variant="ghost" disabled={page + 1 >= data.totalPages || loading || busy} onClick={() => setPage(value => value + 1)}>Далее</Button>
    </div>}
  </section>;
}
