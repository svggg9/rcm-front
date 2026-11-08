"use client";

import { orderPaymentStatusLabels } from "../../lib/order-presentation";
import { useSearchParams } from "next/navigation";
import { TextInput } from "../../components/ui/TextInput";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Button } from "../../components/ui/Button";
import { CabinetPanel } from "../../components/ui/CabinetPanel";
import { FormSelect } from "../../components/ui/FormSelect";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { AdminSearchForm } from "./AdminSearchForm";
import { useAdminNavigation } from "./AdminWorkspaceControls";
import { adminDate, adminMoney } from "../lib/workspaceApi";
import styles from "./AdminWorkspace.module.css";
import { AdminPaymentReview } from "./AdminPaymentReview";
import { AdminRefundOperations } from "./AdminRefundOperations";
import { AdminLatePayments } from "./AdminLatePayments";

import type { AdminOrder, AdminOrderListItem } from "../types";

type Props = {
  orders: AdminOrderListItem[];
  totalElements: number;
  loadingMore: boolean;
  onLoadMore?: () => void;
  buildStatusLabel: (order: AdminOrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
  onLoadOrder?: (orderId: number) => Promise<AdminOrder>;
  onPrefetchOrder?: (orderId: number) => void;
  onRefresh?: () => void;
};

export function AdminOrdersTab({
  orders,
  totalElements,
  loadingMore,
  onLoadMore,
  buildStatusLabel,
  onOpenOrder,
  onPrefetchOrder,
  onRefresh,
}: Props) {
  const params = useSearchParams(); const navigate = useAdminNavigation();
  const raw = params.get("orderView");
  const view = raw === "payments" || raw === "late" || raw === "refunds" ? raw : "list";
  const payment=params.get("paymentStatus")??"", delivery=params.get("deliveryStatus")??"";
  const quick=!payment&&!delivery?"all":payment==="PENDING"&&!delivery?"unpaid":!payment&&delivery==="READY_FOR_SHIPMENT"?"ship":!payment&&delivery==="DELIVERED"?"delivered":"custom";
  const quickItems=[{value:"all",label:"Все"},{value:"unpaid",label:"Ожидают оплаты"},{value:"ship",label:"К отправке"},{value:"delivered",label:"Доставлены"},...(quick==="custom"?[{value:"custom",label:"Свои фильтры"}]:[])];
  return (
    <section className={styles.page}>
      <header className={styles.header}><h1>Заказы</h1>{onRefresh && <Button variant="secondary" onClick={onRefresh}>Обновить</Button>}</header>
      <CabinetPanel items={[{ value: "list", label: "Все заказы" }, { value: "payments", label: "Проверка оплат" }, { value: "late", label: "Поздние оплаты" }, { value: "refunds", label: "Возвраты денег" }]}
        value={view} onChange={value => navigate({ orderView: value === "list" ? null : value })} ariaLabel="Разделы заказов">
        {view === "payments" ? <AdminPaymentReview onOpenOrder={onOpenOrder} /> : view === "late" ? <AdminLatePayments /> : view === "refunds" ? <AdminRefundOperations onOpenOrder={onOpenOrder} /> : <>
          <SegmentedControl ariaLabel="Быстрые фильтры заказов" value={quick} items={quickItems} onChange={value=>navigate({paymentStatus:value==="unpaid"?"PENDING":null,deliveryStatus:value==="ship"?"READY_FOR_SHIPMENT":value==="delivered"?"DELIVERED":null})} />
          <AdminSearchForm label="Номер заказа, товар, получатель или телефон" withSeller />
          <div className={styles.filters}>
            <FormSelect label="Оплата" value={params.get("paymentStatus") ?? ""} emptyOptionLabel="Все статусы оплаты" options={Object.entries(orderPaymentStatusLabels).map(([value, label]) => ({ value, label }))} onChange={value => navigate({ paymentStatus: String(value) || null })} />
            <FormSelect label="Доставка" value={params.get("deliveryStatus") ?? ""} emptyOptionLabel="Все статусы доставки" options={[{ value: "PENDING", label: "Не оформлена" }, { value: "READY_FOR_SHIPMENT", label: "Готов к отправке" }, { value: "IN_TRANSIT", label: "В пути" }, { value: "READY_FOR_PICKUP", label: "Готов к выдаче" }, { value: "DELIVERED", label: "Доставлен" }, { value: "RETURNED", label: "Возвращён" }, { value: "CANCELLED", label: "Отменена" }]} onChange={value => navigate({ deliveryStatus: String(value) || null })} />
          </div>
          <div className={styles.filters}>
            <TextInput label="Создан с" type="date" value={params.get("from")??""} max={params.get("to")||"9999-12-31"} onChange={event=>navigate({from:event.target.value||null})} />
            <TextInput label="Создан по" type="date" value={params.get("to")??""} min={params.get("from")||undefined} max="9999-12-31" onChange={event=>navigate({to:event.target.value||null})} />
            {(payment||delivery||params.get("from")||params.get("to")) && <Button variant="ghost" onClick={()=>navigate({paymentStatus:null,deliveryStatus:null,from:null,to:null})}>Сбросить фильтры</Button>}
          </div>
          {orders.length ? <div className={styles.list}>{orders.map(order => <article key={order.id} className={styles.row}>
            <div><strong>Заказ №{order.id}</strong><p>{order.firstProductTitle || "Товары заказа"}</p><p className={styles.hint}>{order.recipientName || "Получатель не указан"} | {adminDate(order.createdAt)} | {order.itemsCount} шт.</p></div>
            <StatusBadge tone={order.paymentStatus === "FAILED" ? "danger" : order.paymentStatus === "PENDING" ? "warning" : "default"}>{buildStatusLabel(order)}</StatusBadge>
            <strong className={styles.number}>{adminMoney(order.totalAmount, order.currency)}</strong>
            <Button variant="secondary" onMouseEnter={() => onPrefetchOrder?.(order.id)} onFocus={() => onPrefetchOrder?.(order.id)} onClick={() => onOpenOrder(order.id)}>Открыть</Button>
          </article>)}</div> : <EmptyState icon="search" title="Заказов нет" text="По выбранным условиям ничего не найдено" />}
          <ListLoadMore loaded={orders.length} total={totalElements} loading={loadingMore} onLoadMore={onLoadMore} />
        </>}
      </CabinetPanel>
    </section>
  );
}
