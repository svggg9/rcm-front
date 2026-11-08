"use client";
import { useSearchParams } from "next/navigation";
import { ConfirmActionButton } from "../../components/ui/ConfirmActionButton";
import { API_URL } from "../../lib/api";
import { requestApiResponse } from "../../lib/apiRequest";
import { readApiError } from "../../lib/apiErrors";
import { Button } from "../../components/ui/Button";
import { CabinetPanel } from "../../components/ui/CabinetPanel";
import { FormSelect } from "../../components/ui/FormSelect";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAdminResource, adminDate, type WorkspacePage } from "../lib/workspaceApi";
import { AdminSearchForm } from "./AdminSearchForm";
import { AdminPageControls, AdminResourceState, useAdminNavigation, adminPageNumber } from "./AdminWorkspaceControls";
import { AdminCdekTab } from "./AdminCdekTab";
import type { ComponentProps } from "react";
import styles from "./AdminWorkspace.module.css";
type Row = { id: number; orderId: number; status: string; cdekNumber: string | null; canSync: boolean; error: string | null; syncedAt: string | null; createdAt: string | null };
const labels: Record<string,string> = { NEW: "Новое", PROCESSING: "Оформляется", CREATED: "Создана накладная", ACCEPTED: "Принят СДЭК", READY_FOR_PICKUP: "Готов к выдаче", IN_TRANSIT: "В пути", DELIVERED: "Доставлен", NOT_DELIVERED: "Не доставлен", CANCELLED: "Отменён", FAILED: "Ошибка оформления" };
export function AdminDeliveryWorkspace(props: ComponentProps<typeof AdminCdekTab> & { onOpenOrder: (id: number) => void }) {
  const params = useSearchParams(); const navigate = useAdminNavigation(); const technical = params.get("deliveryView") === "events";
  return <section className={styles.page}><header className={styles.header}><h1>Доставка</h1></header>
    <CabinetPanel items={[{ value: "shipments", label: "Отправления" }, { value: "events", label: "События СДЭК" }]} value={technical ? "events" : "shipments"} onChange={value => navigate({ deliveryView: value === "events" ? "events" : null })} ariaLabel="Разделы доставки">
      {technical ? <AdminCdekTab {...props} /> : <Shipments onOpenOrder={props.onOpenOrder} />}
    </CabinetPanel>
  </section>;
}
function Shipments({ onOpenOrder }: { onOpenOrder: (id: number) => void }) {
  const params = useSearchParams(); const navigate = useAdminNavigation(); const status = params.get("shipmentStatus") ?? "PROBLEMS";
  const { data, error, loading, refresh } = useAdminResource<WorkspacePage<Row>>(`deliveries?${new URLSearchParams({ q: params.get("q") ?? "", status, page: String(adminPageNumber(params.get("page"))) })}`);
  return <div className={styles.page}><AdminSearchForm label="Номер заказа или отправления СДЭК" />
    <div className={styles.filters}><FormSelect label="Статус отправления" value={status} options={[{ value: "PROBLEMS", label: "Требуют внимания" }, { value: "ALL", label: "Все отправления" }, ...Object.entries(labels).map(([value,label]) => ({value,label}))]} onChange={value => navigate({ shipmentStatus: String(value), page: null })} /><Button variant="secondary" onClick={refresh} loading={loading}>Обновить</Button></div>
    <AdminResourceState loading={loading} error={error} hasData={data !== undefined} empty={data?.content.length === 0} onRetry={refresh} />
    {data && <><div className={styles.list}>{data.content.map(row => {
      const showError = !!row.error && !["DELIVERED", "CANCELLED", "NOT_DELIVERED"].includes(row.status);
      const tone = row.status === "NOT_DELIVERED" ? "warning" : showError || row.status === "FAILED" ? "danger" : "default";
      return <article key={row.id} className={styles.row}><div><strong>Заказ №{row.orderId}</strong><p>{row.cdekNumber ? `СДЭК ${row.cdekNumber}` : "Номер СДЭК пока не присвоен"}</p><p className={styles.hint}>Обновление: {adminDate(row.syncedAt || row.createdAt)}</p>{showError && <details className={styles.error}><summary>Ошибка доставки</summary><p>{row.error}</p></details>}</div><StatusBadge tone={tone}>{labels[row.status] ?? "Статус уточняется"}</StatusBadge><div className={styles.actions}><Button variant="secondary" onClick={() => onOpenOrder(row.orderId)}>Открыть заказ</Button>{row.canSync === true && <ConfirmActionButton variant="secondary" disabled={loading || !!error} confirmTitle="Сверить доставку со СДЭК" confirmText="Будет запрошено текущее состояние отправления и обновлён статус заказа" confirmLabel="Сверить" onConfirm={async()=>{const response=await requestApiResponse(`${API_URL}/api/delivery/shipments/order/${row.orderId}/sync`,{method:"POST"},"Не удалось получить результат сверки — обновите отправления перед повтором");if(!response.ok)throw await readApiError(response,"Не удалось сверить доставку — проверьте событие СДЭК и повторите позже");refresh();}}>Сверить со СДЭК</ConfirmActionButton>}</div></article>;
    })}</div><AdminPageControls page={data.number} totalPages={data.totalPages} total={data.totalElements} onChange={value => navigate({ page: String(value) })} /></>}
  </div>;
}
