"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { paymentRequest, refundLabel, operationMoney, type OperationPage, type RefundOperation } from "../lib/paymentOperations";
import styles from "./AdminPaymentReview.module.css";

export function AdminRefundOperations({ onOpenOrder }: { onOpenOrder: (id: number) => void }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<OperationPage<RefundOperation> | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [proof, setProof] = useState<RefundOperation | null>(null);
  const [evidence, setEvidence] = useState("");
  const [proofError, setProofError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    void paymentRequest<OperationPage<RefundOperation>>(`/api/payments/refund-operations?page=${page}&size=20`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setData(result); setError(""); if (page > 0 && page >= result.totalPages) setPage(Math.max(0, result.totalPages - 1)); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Ошибка загрузки возвратов"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden && !inFlight.current) reload(); }, 15000);
    window.addEventListener("refund-operations-changed", reload);
    return () => { clearInterval(timer); window.removeEventListener("refund-operations-changed", reload); };
  }, [reload]);

  async function act(row: RefundOperation, action: "execute" | "retry" | "sync" | "confirm-resolution") {
    if (inFlight.current) return;
    if (action === "confirm-resolution" && !evidence.trim()) { setProofError("Укажите основание банковской сверки"); return; }
    if ((action === "execute" || action === "retry") && !window.confirm(
      `${action === "retry" ? "Повторить ту же операцию" : "Отправить возврат"} на ${operationMoney(row.amount, row.currency)}? Новый возврат создан не будет.`)) return;
    inFlight.current = true; setBusy(true); setActionError(""); setProofError(""); setMessage("");
    try {
      const updated = await paymentRequest<RefundOperation>(`/api/payments/refund-operations/${row.id}/${action}`, {
        method: "POST", ...(action === "confirm-resolution" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          amount: row.amount, currency: row.currency, requestReference: row.requestReference, evidence: evidence.trim(),
        }) } : {}),
      });
      setMessage(`Возврат №${updated.id}: ${refundLabel(updated)}`);
      setProof(null); reload(); window.dispatchEvent(new Event("refund-operations-changed"));
    } catch (reason) {
      const text = reason instanceof Error ? reason.message : "Ошибка операции";
      if (action === "confirm-resolution") setProofError(text); else setActionError(text);
      reload();
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <section className={styles.panel} aria-label="Очередь возвратов" aria-busy={busy || loading}>
    <div className={styles.heading}><h2>Возвраты, ожидающие завершения{data ? ` · ${data.totalElements}` : ""}</h2>
      <Button variant="ghost" disabled={busy} onClick={reload}>Обновить</Button></div>
    <p>Создание запроса не означает возврат денег. Завершение фиксируется после подтверждения операции.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {actionError && <p className={styles.error} role="alert">{actionError}</p>}
    {message && <p role="status">{message}</p>}
    {loading && <p role="status">Загрузка…</p>}
    {data?.content.map(row => <article className={styles.operation} key={row.id} aria-label={`Возврат №${row.id}`}>
      <div className={styles.heading}><strong>Возврат №{row.id} · {operationMoney(row.amount, row.currency)}</strong>
        {row.orderId != null && <button className={styles.order} onClick={() => onOpenOrder(row.orderId!)}>Заказ №{row.orderId}</button>}</div>
      <p>{refundLabel(row)}</p>
      <dl className={styles.facts}>
        <div><dt>Платёж</dt><dd>{row.paymentId}</dd></div><div><dt>Попытки отправки</dt><dd>{row.dispatchAttempts}</dd></div>
        <div><dt>Ключ операции</dt><dd>{row.requestReference || "Старая операция без ключа"}</dd></div>
        <div><dt>Номер в банке</dt><dd>{row.externalId || "Ещё не получен"}</dd></div>
        {row.nextDispatchAt && <div><dt>Следующая попытка при включённом обработчике</dt><dd>{new Date(row.nextDispatchAt).toLocaleString("ru-RU")}</dd></div>}
      </dl>
      {row.failureReason && <p className={styles.error}>Причина проверки: {row.failureReason}</p>}
      <div className={styles.actions}>
        {row.status === "PENDING" && row.requestReference && row.dispatchState === "READY" && <Button disabled={busy || !!error} onClick={() => void act(row, "execute")}>Отправить возврат</Button>}
        {row.status === "PENDING" && row.requestReference && ["RETRY", "REVIEW"].includes(row.dispatchState) && <Button disabled={busy || !!error} onClick={() => void act(row, "retry")}>Повторить ту же операцию</Button>}
        {row.status === "PENDING" && row.dispatchState === "SENDING" && row.dispatchedAt && Date.now() - new Date(row.dispatchedAt).getTime() >= 120000 && <Button disabled={busy || !!error} onClick={() => void act(row, "execute")}>Восстановить отправку</Button>}
        {row.externalId && <Button variant="ghost" disabled={busy || !!error} onClick={() => void act(row, "sync")}>Сверить статус</Button>}
        {row.status === "PENDING" && row.dispatchState !== "SENDING" && (!row.requestReference || row.dispatchAttempts > 0) && <Button variant="ghost" disabled={busy || !!error} onClick={() => { setProof(row); setEvidence(""); setProofError(""); }}>Подтвердить по банковской сверке</Button>}
      </div>
    </article>)}
    {data && !data.content.length && !loading && !error && <p>Нет возвратов, ожидающих завершения</p>}
    {data && data.totalPages > 1 && <div className={styles.actions}>
      <Button variant="ghost" disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>Назад</Button>
      <span>Страница {page + 1} из {data.totalPages}</span>
      <Button variant="ghost" disabled={busy || page + 1 >= data.totalPages} onClick={() => setPage(value => value + 1)}>Далее</Button></div>}
    {proof && <Dialog title={`Подтверждение возврата №${proof.id}`} busy={busy} onClose={() => setProof(null)} actions={<>
      <Button variant="ghost" disabled={busy} onClick={() => setProof(null)}>Отмена</Button>
      <Button loading={busy} onClick={() => void act(proof, "confirm-resolution")}>Подтвердить возврат</Button></>}>
      <p>Подтверждайте только после проверки фактического возврата {operationMoney(proof.amount, proof.currency)} в банке. Это запишет результат и финансовые проводки; деньги повторно не отправляются.</p>
      <p className={styles.reference}>Ключ: {proof.requestReference || "Старая операция без ключа"}</p>
      <label data-ui="field"><span>Основание банковской сверки</span><textarea value={evidence} maxLength={1000} disabled={busy}
        onChange={event => setEvidence(event.target.value)} aria-invalid={!!proofError} aria-describedby="refund-proof-error" /></label>
      <p>Укажите номер реестра, банковского обращения или ссылку на подтверждение суммы и операции.</p>
      {proofError && <p id="refund-proof-error" className={styles.error} role="alert">{proofError}</p>}
    </Dialog>}
  </section>;
}
