"use client";

import { useConfirmation } from "../../components/ui/ConfirmActionButton";
import { Loader } from "../../components/ui/Loader";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, apiFetch } from "../../lib/api";
import { readApiError } from "../../lib/apiErrors";
import { requestApiResponse } from "../../lib/apiRequest";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/toast";
import { isPaymentReviewPage } from "../lib/adminOperationQueueValidation";
import styles from "./AdminPaymentReview.module.css";

type Review = {
  orderId: number; orderGroupId: string; status: string; paymentStatus: string;
  paymentDueAt: string | null; reservationReleasedAt: string | null;
  initializationPending: boolean; latePaymentId: number | null; initializationRecoverable?: boolean;
};
type Page = { content: Review[]; number: number; totalPages: number; totalElements: number };

export function AdminPaymentReview({ onOpenOrder }: { onOpenOrder: (id: number) => void }) {
  const {confirm,confirmation}=useConfirmation();
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ page: number; key: string; data?: Page; error?: string }>();
  const generation = useRef(0);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const key = `${page}:${revision}`;
  const current = result?.page === page ? result : undefined;
  const data = current?.data;
  const loading = current?.key !== key;
  const error = loading ? "" : current?.error ?? "";
  const canAct = !loading && !error && !!data;
  const reload = useCallback(() => { generation.current++; setRevision(value => value + 1); }, []);
  const changePage = (next: number) => { generation.current++; setPage(next); };

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch(`${API_URL}/api/admin/payment-review?page=${page}&size=20`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Не удалось загрузить очередь проверки оплат");
        const result: unknown = await response.json();
        if (!isPaymentReviewPage(result, page)) throw new Error("Не удалось прочитать очередь оплат");
        if (!controller.signal.aborted) setResult({ page, key, data: result as Page });
      })
      .catch(reason => { if (!controller.signal.aborted) setResult({ page, key, error: reason instanceof Error ? reason.message : "Ошибка загрузки" }); });
    return () => controller.abort();
  }, [page, key]);

  useEffect(() => {
    const refresh = () => { if (!document.hidden) reload(); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("refund-operations-changed", refresh);
    return () => { clearInterval(timer); window.removeEventListener("refund-operations-changed", refresh); };
  }, [reload]);

  async function act(row: Review, recover = false) {
    if (!canAct || inFlight.current) return;
    const actionGeneration = generation.current;
    if (recover && !await confirm({title:"Восстановить платёж",text:"Найденная неоплаченная попытка будет отменена. Если оплата прошла, она будет учтена в заказах",label:"Проверить банк"})) return;
    if (actionGeneration !== generation.current || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    const toastId = `admin-payment-review-${row.orderGroupId}`;
    try {
      const path = encodeURIComponent(row.orderGroupId) + "/" + (recover ? "recover-initialization" : "reconcile");
      const unknownResult = "Результат операции неизвестен — обновите данные и сверьте состояние перед повтором";
      const response = await requestApiResponse(API_URL + "/api/admin/payment-review/" + path, { method: "POST" }, unknownResult);
      if (!response.ok) throw await readApiError(response, response.status === 409 ? "Состояние операции изменилось — обновите данные перед повтором" : unknownResult);
      toast.success("Сверка выполнена. Неразрешённые случаи остаются в очереди", { id: toastId, description: undefined, action: undefined }); reload();
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Ошибка операции", { id: toastId }); reload(); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return <>{confirmation}<section className={styles.panel} aria-label="Проверка оплат">
    <div className={styles.heading}><h2>Оплаты, требующие проверки{data ? ` · ${data.totalElements}` : ""}</h2>
      <Button variant="ghost" onClick={reload} disabled={loading || busy}>Обновить</Button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading && <Loader label="Загрузка данных" />}
    {data?.content.map(row => <div className={styles.row} key={row.orderId}>
      <button className={styles.order} onClick={() => onOpenOrder(row.orderId)}>Заказ №{row.orderId}</button>
      <span>{row.latePaymentId ? "Поздняя оплата" : row.initializationPending ? "Не подтверждено создание платежа" : !row.paymentDueAt ? "Проверка старого резерва" : "Сверка оплаты или отмены"}</span>
      <span>{row.reservationReleasedAt ? "Резерв освобождён" : "Резерв требует проверки"}</span>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={() => void act(row, false)} disabled={busy || !canAct}>Проверить</Button>
        {row.initializationRecoverable && <Button variant="secondary" onClick={() => void act(row, true)} disabled={busy || !canAct}>Восстановить платёж</Button>}
        {row.latePaymentId && <span>Выберите платёж в блоке «Поздние платежи»</span>}
      </div>
    </div>)}
    {data && !data.content.length && !loading && !error && <p>Нет оплат, требующих проверки</p>}
    {data && data.totalPages > 1 && <div className={styles.actions}>
      <Button variant="ghost" disabled={page === 0 || loading || busy} onClick={() => changePage(page - 1)}>Назад</Button>
      <span>Страница {page + 1} из {data.totalPages}</span>
      <Button variant="ghost" disabled={page + 1 >= data.totalPages || loading || busy} onClick={() => changePage(page + 1)}>Далее</Button>
    </div>}
  </section></>;
}
