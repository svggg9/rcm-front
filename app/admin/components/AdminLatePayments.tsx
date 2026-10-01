"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { findReviewOrders, operationMoney, paymentRequest, type LatePayment, type OperationPage } from "../lib/paymentOperations";
import styles from "./AdminPaymentReview.module.css";

export function AdminLatePayments() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<OperationPage<LatePayment> | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [selection, setSelection] = useState<{ payment: LatePayment; orders: number[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void paymentRequest<OperationPage<LatePayment>>(`/api/admin/payment-review/late-payments?page=${page}&size=20`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setData(result); setError(""); if (page > 0 && page >= result.totalPages) setPage(Math.max(0, result.totalPages - 1)); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Ошибка загрузки поздних оплат"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden && !inFlight.current) setRevision(value => value + 1); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("refund-operations-changed", refresh);
    return () => { clearInterval(timer); window.removeEventListener("refund-operations-changed", refresh); };
  }, []);
  async function choose(row: LatePayment) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setActionError("");
    try { setSelection({ payment: row, orders: await findReviewOrders(row.orderGroupId) }); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : "Не удалось загрузить заказы"); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function refund(row: LatePayment, orderId: number) {
    if (inFlight.current) return;
    const remaining = row.amount - row.refundedAmount - row.pendingRefundAmount;
    if (remaining <= 0 || !window.confirm(`Создать возврат по заказу №${orderId} из платежа №${row.paymentId}? Сумма ограничена оплатой этого заказа и уже созданными возвратами.`)) return;
    inFlight.current = true; setBusy(true); setMessage(""); setActionError("");
    try {
      await paymentRequest(`/api/admin/payment-review/${orderId}/late-refund?paymentId=${row.paymentId}`, { method: "POST" });
      setMessage(`Запрос возврата по платежу №${row.paymentId} создан. Проверьте отправку и результат в очереди возвратов`);
      setSelection(null);
      window.dispatchEvent(new Event("refund-operations-changed"));
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Не удалось создать запрос возврата"); }
    finally { inFlight.current = false; setBusy(false); setRevision(value => value + 1); }
  }
  return <section className={styles.panel} aria-label="Поздние платежи" aria-busy={busy || loading}>
    <div className={styles.heading}><h2>Поздние платежи{data ? ` · ${data.totalElements}` : ""}</h2>
      <Button variant="ghost" disabled={busy} onClick={() => setRevision(value => value + 1)}>Обновить</Button></div>
    <p>Каждая оплаченная попытка показана отдельно. Возврат не возобновляет отменённый заказ.</p>
    {loading && <p role="status">Загрузка…</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {actionError && !selection && <p className={styles.error} role="alert">{actionError}</p>}
    {message && <p role="status">{message}</p>}
    {data?.content.map(row => <article className={styles.operation} key={row.paymentId} aria-label={`Поздний платёж №${row.paymentId}`}>
      <strong>Платёж №{row.paymentId} · {operationMoney(row.amount, row.currency)}</strong>
      <dl className={styles.facts}>
        <div><dt>Группа заказов</dt><dd>{row.orderGroupId}</dd></div>
        <div><dt>Номер в банке</dt><dd>{row.externalPaymentId}</dd></div>
        <div><dt>Возвращено</dt><dd>{operationMoney(row.refundedAmount, row.currency)}</dd></div>
        <div><dt>Ожидает возврата</dt><dd>{operationMoney(row.pendingRefundAmount, row.currency)}</dd></div>
        {row.paidAt && <div><dt>Дата оплаты</dt><dd>{new Date(row.paidAt).toLocaleString("ru-RU")}</dd></div>}
      </dl>
      {row.amount - row.refundedAmount - row.pendingRefundAmount > 0 ? <Button disabled={busy || !!error} onClick={() => void choose(row)}>Выбрать заказ для возврата</Button>
        : <p>Запрос на оставшуюся сумму уже создан. Проверьте очередь возвратов.</p>}
    </article>)}
    {data && !data.content.length && !loading && !error && <p>Нет поздних платежей, ожидающих возврата</p>}
    {data && data.totalPages > 1 && <div className={styles.actions}>
      <Button variant="ghost" disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>Назад</Button>
      <span>Страница {page + 1} из {data.totalPages}</span>
      <Button variant="ghost" disabled={busy || page + 1 >= data.totalPages} onClick={() => setPage(value => value + 1)}>Далее</Button></div>}
    {selection && <Dialog title={`Поздний платёж №${selection.payment.paymentId}`} busy={busy} onClose={() => setSelection(null)}
      actions={<Button variant="ghost" disabled={busy} onClick={() => setSelection(null)}>Закрыть</Button>}>
      <p>Возврат оформляется отдельно по каждому заказу группы. Сумму определяет сервер с учётом уже созданных возвратов. Если возврат по заказу уже оформлен, повторный запрос будет отклонён.</p>
      <div className={styles.actions}>{selection.orders.map(orderId => <Button key={orderId} disabled={busy} onClick={() => void refund(selection.payment, orderId)}>Возврат по заказу №{orderId}</Button>)}</div>
      {actionError && <p className={styles.error} role="alert">{actionError}</p>}
    </Dialog>}
  </section>;
}
