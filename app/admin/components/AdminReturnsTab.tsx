"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { FormSelect } from "../../components/ui/FormSelect";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { returnStatusLabels, returnReasonLabels } from "../../lib/returns";
import { adminDate, useAdminResource, type WorkspacePage } from "../lib/workspaceApi";
import { AdminSearchForm } from "./AdminSearchForm";
import { AdminReturnRequests } from "./AdminReturnRequests";
import { AdminPageControls, AdminResourceState, useAdminNavigation, adminPageNumber } from "./AdminWorkspaceControls";
import styles from "./AdminWorkspace.module.css";

type Row = { id: number; orderId: number; status: keyof typeof returnStatusLabels; reason: keyof typeof returnReasonLabels; productTitle: string; sellerName: string; createdAt: string };

export function AdminReturnsTab({ onOpenOrder }: { onOpenOrder: (id: number) => void }) {
  const params = useSearchParams(); const navigate = useAdminNavigation();
  const page = adminPageNumber(params.get("page")); const status = params.get("returnStatus") ?? "ALL";
  const selected = Number(params.get("returnOrder"));
  const { data, loading, error, refresh } = useAdminResource<WorkspacePage<Row>>(`returns?${new URLSearchParams({ q: params.get("q") ?? "", status, page: String(page) })}`);
  useEffect(() => { window.addEventListener("refund-operations-changed", refresh); return () => window.removeEventListener("refund-operations-changed", refresh); }, [refresh]);
  return <section className={styles.page}>
    <header className={styles.header}><h1>Возвраты</h1><Button variant="secondary" onClick={refresh} loading={loading}>Обновить</Button></header>
    <AdminSearchForm label="Номер возврата, заказа, товар или продавец" />
    <div className={styles.filters}><FormSelect label="Статус заявки" value={status} options={[{ value: "ALL", label: "Все статусы" }, ...Object.entries(returnStatusLabels).map(([value, label]) => ({ value, label }))]} onChange={value => navigate({ returnStatus: String(value), page: null })} /></div>
    <AdminResourceState loading={loading} error={error} hasData={data !== undefined} empty={data?.content.length === 0} onRetry={refresh} />
    {data && <><div className={styles.list}>{data.content.map(row => <article key={row.id} className={styles.row}>
      <div><strong>Возврат №{row.id}</strong><p>{row.productTitle || "Товары заказа"}</p><p className={styles.hint}>Заказ №{row.orderId} | {row.sellerName} | {adminDate(row.createdAt)}</p><p className={styles.hint}>{returnReasonLabels[row.reason] ?? row.reason}</p></div>
      <StatusBadge>{returnStatusLabels[row.status] ?? row.status}</StatusBadge>
      <div className={styles.actions}><Button variant="secondary" onClick={() => navigate({ returnOrder: String(row.orderId) })}>Рассмотреть</Button><Button variant="ghost" onClick={() => onOpenOrder(row.orderId)}>Заказ</Button></div>
    </article>)}</div><AdminPageControls page={data.number} totalPages={data.totalPages} total={data.totalElements} onChange={value => navigate({ page: String(value) })} /></>}
    {Number.isSafeInteger(selected) && selected > 0 && <Dialog title={`Возвраты заказа №${selected}`} actions={null} size="wide" mobileFullscreen onClose={() => { navigate({ returnOrder: null }); refresh(); }}><AdminReturnRequests orderId={selected} /></Dialog>}
  </section>;
}
