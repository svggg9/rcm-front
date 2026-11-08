"use client";

import { useSearchParams } from "next/navigation";
import { Textarea } from "../../components/ui/Textarea";
import { useConfirmation } from "../../components/ui/ConfirmActionButton";
import { Loader } from "../../components/ui/Loader";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { toast } from "../../components/ui/toast";
import { paymentRequest, refundLabel, operationMoney, type OperationPage, type RefundOperation } from "../lib/paymentOperations";
import { isRefundOperation, isRefundOperationPage } from "../lib/adminOperationQueueValidation";
import styles from "./AdminPaymentReview.module.css";

export function AdminRefundOperations({ onOpenOrder }: { onOpenOrder: (id: number) => void }) {
  const {confirm,confirmation}=useConfirmation();
  const params = useSearchParams();
  const rawRefundId = params.get("refundId");
  const parsedRefundId = rawRefundId && /^[1-9]\d*$/.test(rawRefundId) ? Number(rawRefundId) : null;
  const refundId = parsedRefundId && Number.isSafeInteger(parsedRefundId) ? parsedRefundId : null;
  const [page, setPage] = useState(0);
  const scope = refundId ? `refund:${refundId}` : `page:${page}`;
  const [result, setResult] = useState<{ scope: string; key: string; data?: OperationPage<RefundOperation>; error?: string }>();
  const generation = useRef(0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [proof, setProof] = useState<RefundOperation | null>(null);
  const [evidence, setEvidence] = useState("");
  const [proofError, setProofError] = useState("");
  const [revision, setRevision] = useState(0);
  const key = `${scope}:${revision}`;
  const current = result?.scope === scope ? result : undefined;
  const data = current?.data;
  const loading = current?.key !== key;
  const error = loading ? "" : current?.error ?? "";
  const canAct = !loading && !error && !!data;
  const proofIsCurrent = !!proof && !!data?.content.some(row => row.id === proof.id && JSON.stringify(row) === JSON.stringify(proof));
  const reload = useCallback(() => { generation.current++; setRevision(value => value + 1); }, []);
  const changePage = (next: number) => { generation.current++; setPage(next); };
  useEffect(() => {
    const controller = new AbortController();
    const request = refundId
      ? paymentRequest<unknown>(`/api/payments/refund-operations/${refundId}`, { signal: controller.signal }).then(row => {
          if (!isRefundOperation(row) || row.id !== refundId) throw new Error("Не удалось прочитать данные возврата");
          return { content: [row], number: 0, totalPages: 1, totalElements: 1 };
        })
      : paymentRequest<unknown>(`/api/payments/refund-operations?page=${page}&size=20`, { signal: controller.signal }).then(value => {
          if (!isRefundOperationPage(value, page)) throw new Error("Не удалось прочитать очередь возвратов");
          return value;
        });
    void request.then(data => { if (!controller.signal.aborted) {
        setResult({ scope, key, data });
        if (!refundId && page > 0 && page >= data.totalPages) { generation.current++; setPage(Math.max(0, data.totalPages - 1)); }
      } })
      .catch(reason => { if (!controller.signal.aborted) setResult({ scope, key, error: reason instanceof Error ? reason.message : "Ошибка загрузки возвратов" }); });
    return () => controller.abort();
  }, [page, key, scope, refundId]);
  useEffect(() => () => { generation.current++; }, [scope]);
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden && !inFlight.current) reload(); }, 15000);
    window.addEventListener("refund-operations-changed", reload);
    return () => { clearInterval(timer); window.removeEventListener("refund-operations-changed", reload); };
  }, [reload]);

  async function act(row: RefundOperation, action: "execute" | "retry" | "sync" | "confirm-resolution") {
    if (!canAct || inFlight.current || !data?.content.some(currentRow => currentRow.id === row.id && JSON.stringify(currentRow) === JSON.stringify(row))) return;
    const actionGeneration = generation.current;
    if (action === "confirm-resolution" && !evidence.trim()) { setProofError("Укажите основание банковской сверки"); return; }
    if ((action === "execute" || action === "retry") && !await confirm({title:action==="retry"?"Повторить отправку":"Отправить возврат",text:`Сумма ${operationMoney(row.amount,row.currency)}. Будет использована та же операция возврата`,label:"Подтвердить"})) return;
    if (actionGeneration !== generation.current || inFlight.current) return;
    inFlight.current = true; setBusy(true); setProofError("");
    const toastId = `admin-refund-operation-${row.id}`;
    try {
      const updated = await paymentRequest<RefundOperation>(`/api/payments/refund-operations/${row.id}/${action}`, {
        method: "POST", ...(action === "confirm-resolution" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          amount: row.amount, currency: row.currency, requestReference: row.requestReference, evidence: evidence.trim(),
        }) } : {}),
      });
      const notify = updated.status === "SUCCEEDED" ? toast.success
        : updated.status === "FAILED" || updated.status === "CANCELED" ? toast.error : toast.info;
      notify(`Возврат №${updated.id}: ${refundLabel(updated)}`, { id: toastId, description: undefined, action: undefined });
      setProof(null); reload(); window.dispatchEvent(new Event("refund-operations-changed"));
    } catch (reason) {
      const text = reason instanceof Error ? reason.message : "Ошибка операции";
      if (action === "confirm-resolution") setProofError(text); else toast.error(text, { id: toastId });
      reload();
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <>{confirmation}<section className={styles.panel} aria-label="Очередь возвратов" aria-busy={busy || loading}>
    <div className={styles.heading}><h2>{refundId ? `Возврат №${refundId}` : `Возвраты, ожидающие завершения${data ? ` · ${data.totalElements}` : ""}`}</h2>
      <Button variant="ghost" disabled={busy || loading} onClick={reload}>Обновить</Button></div>
    {refundId && <Button variant="ghost" onClick={() => { generation.current++; const next = new URLSearchParams(params); next.delete("refundId"); window.history.pushState(null, "", `/admin?${next}`); }}>Все возвраты</Button>}
    <p>Создание запроса не означает возврат денег. Завершение фиксируется после подтверждения операции.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading && <Loader label="Загрузка данных" />}
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
        {row.status === "PENDING" && row.requestReference && row.dispatchState === "READY" && <Button disabled={busy || !canAct} onClick={() => void act(row, "execute")}>Отправить возврат</Button>}
        {row.status === "PENDING" && row.requestReference && ["RETRY", "REVIEW"].includes(row.dispatchState) && <Button disabled={busy || !canAct} onClick={() => void act(row, "retry")}>Повторить ту же операцию</Button>}
        {row.status === "PENDING" && row.dispatchState === "SENDING" && row.dispatchedAt && Date.now() - new Date(row.dispatchedAt).getTime() >= 120000 && <Button disabled={busy || !canAct} onClick={() => void act(row, "execute")}>Восстановить отправку</Button>}
        {row.externalId && <Button variant="ghost" disabled={busy || !canAct} onClick={() => void act(row, "sync")}>Сверить статус</Button>}
        {row.status === "PENDING" && row.dispatchState !== "SENDING" && (!row.requestReference || row.dispatchAttempts > 0) && <Button variant="ghost" disabled={busy || !canAct} onClick={() => { setProof(row); setEvidence(""); setProofError(""); }}>Подтвердить по банковской сверке</Button>}
      </div>
    </article>)}
    {data && !data.content.length && !loading && !error && <p>Нет возвратов, ожидающих завершения</p>}
    {data && data.totalPages > 1 && <div className={styles.actions}>
      <Button variant="ghost" disabled={busy || loading || page === 0} onClick={() => changePage(page - 1)}>Назад</Button>
      <span>Страница {page + 1} из {data.totalPages}</span>
      <Button variant="ghost" disabled={busy || loading || page + 1 >= data.totalPages} onClick={() => changePage(page + 1)}>Далее</Button></div>}
    {proof && <Dialog title={`Подтверждение возврата №${proof.id}`} busy={busy} onClose={() => setProof(null)} actions={<>
      <Button variant="ghost" disabled={busy} onClick={() => setProof(null)}>Отмена</Button>
      <Button loading={busy} disabled={!canAct || !proofIsCurrent} onClick={() => void act(proof, "confirm-resolution")}>Подтвердить возврат</Button></>}>
      <p>Подтверждайте только после проверки фактического возврата {operationMoney(proof.amount, proof.currency)} в банке. Это запишет результат и финансовые проводки; деньги повторно не отправляются.</p>
      <p className={styles.reference}>Ключ: {proof.requestReference || "Старая операция без ключа"}</p>
      <Textarea label="Основание банковской сверки" value={evidence} maxLength={1000} disabled={busy} onChange={event=>setEvidence(event.target.value)} error={proofError} />
      <p>Укажите номер реестра, банковского обращения или ссылку на подтверждение суммы и операции.</p>
      {!loading && !proofIsCurrent && <p>Данные обновились. Закройте окно и откройте подтверждение заново</p>}

    </Dialog>}
  </section></>;
}
