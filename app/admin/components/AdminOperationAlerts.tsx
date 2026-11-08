"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { adminDate, useAdminResource } from "../lib/workspaceApi";
import { operationAlertDescription, operationAlertQueue, type AdminOperationAlertPage } from "../lib/adminOperationAlerts";
import { AdminPageControls, AdminResourceState } from "./AdminWorkspaceControls";
import styles from "./AdminWorkspace.module.css";
import dashboardStyles from "./AdminOverview.module.css";

const levels = {
  error: { label: "Ошибка", tone: "danger" },
  review: { label: "Нужна сверка", tone: "warning" },
  waiting: { label: "Ожидает проверки", tone: "default" },
} as const;
const names = { payment: "Оплата", refund: "Возврат", delivery: "Доставка" } as const;

export function AdminOperationAlerts({ sample }: { sample?: AdminOperationAlertPage } = {}) {
  const [page, setPage] = useState(0);
  const resource = useAdminResource<AdminOperationAlertPage>(sample ? null : `operation-alerts?page=${page}&size=10`);
  const data = sample ?? resource.data;
  const loading = sample ? false : resource.loading;
  const error = sample ? undefined : resource.error;
  const refresh = resource.refresh;

  useEffect(() => {
    if (sample) return;
    const onChange = () => refresh();
    window.addEventListener("refund-operations-changed", onChange);
    return () => window.removeEventListener("refund-operations-changed", onChange);
  }, [refresh, sample]);

  return <section className={dashboardStyles.section} aria-labelledby="dashboard-operation-alerts">
    <div className={dashboardStyles.sectionHead}>
      <div><h2 id="dashboard-operation-alerts">Операции требуют проверки</h2>
        <p className="textHint">Оплаты, возвраты денег и доставка с задержкой или неопределённым результатом</p></div>
      <Button variant="secondary" onClick={refresh} loading={loading} disabled={!!sample}>Обновить</Button>
    </div>
    <AdminResourceState loading={loading} error={error} hasData={data !== undefined} onRetry={refresh} />
    {data && <>
      <p className={styles.hint}>Оплаты: {data.summary.payments} · Возвраты: {data.summary.refunds} · Доставка: {data.summary.deliveries}</p>
      {data.content.length ? <div className={styles.list}>{data.content.map(row => {
        const queue = operationAlertQueue(row.kind);
        const queueHref = row.kind === "delivery" && row.operationId !== null ? `${queue.href}&q=${row.orderId}`
          : row.kind === "refund" && row.operationId !== null ? `${queue.href}&refundId=${row.operationId}` : queue.href;
        const level = levels[row.level];
        return <article className={styles.row} key={`${row.kind}:${row.orderId}:${row.operationId ?? "order"}:${row.reason}`}>
          <div><strong>{names[row.kind]} · заказ №{row.orderId}</strong>
            <p>{operationAlertDescription(row.reason)}</p>
            <p className={styles.hint}>{row.operationId !== null && row.kind !== "payment" ? `${names[row.kind]} №${row.operationId} · ` : ""}Отсчёт с {adminDate(row.referenceAt)}</p>
          </div>
          <StatusBadge tone={level.tone}>{level.label}</StatusBadge>
          <div className={styles.actions}>
            <Link className={styles.actionLink} href={sample ? "#operation-alerts" : `/admin?tab=orders&orderId=${row.orderId}`}>Открыть заказ</Link>
            {!(row.kind === "delivery" && row.operationId === null) && <Link className={styles.actionLink} href={sample ? "#operation-alerts" : queueHref}>{row.kind === "refund" ? "Открыть возврат" : queue.label}</Link>}
          </div>
        </article>;
      })}</div> : <p className="textHint">{data.totalElements === 0 ? "Операций, требующих проверки, нет" : "Список изменился — вернитесь к доступной странице"}</p>}
      {data.number > 0 && data.number >= data.totalPages
        ? <Button variant="secondary" onClick={() => setPage(Math.max(0, data.totalPages - 1))}>Вернуться к списку</Button>
        : <AdminPageControls page={data.number} totalPages={data.totalPages} total={data.totalElements} onChange={setPage} />}
      <p className={styles.hint}>Время отсчёта зависит от типа события. Эти состояния могут совпадать с рабочими очередями.</p>
    </>}
  </section>;
}
