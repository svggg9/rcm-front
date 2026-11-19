"use client";

import { useState, type MouseEvent } from "react";
import { CabinetSkeleton } from "../components/ui/CabinetSkeleton";
import { RequestError } from "../components/ui/RequestError";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { SellerOrdersTab } from "../seller/components/SellerOrdersTab";
import type { SellerOrderCardListItem } from "../seller/components/SellerOrderCard";
import styles from "./SellerOrdersExample.module.css";

type ExampleState = "ready" | "empty" | "loading" | "error";
const states: { value: ExampleState; label: string }[] = [
  { value: "ready", label: "Заказы" }, { value: "empty", label: "Пусто" },
  { value: "loading", label: "Загрузка" }, { value: "error", label: "Ошибка" },
];
const base: SellerOrderCardListItem = {
  id: 1042, orderGroupId: "DEMO-1042", createdAt: "2026-11-07T12:00:00Z", currency: "RUB",
  status: "PROCESSING", paymentStatus: "PAID", deliveryStatus: "READY_FOR_SHIPMENT",
  deliveryStatusChangedAt: null, recipientName: "Демонстрационный покупатель",
  firstProductTitle: "Рубашка из хлопка", firstImageUrl: "/examples/demo-shirt-front.svg",
  productTitles: ["Рубашка из хлопка"], itemsCount: 1, totalAmount: 5900,
};
const orders: SellerOrderCardListItem[] = [
  base,
  { ...base, id: 1043, status: "SHIPPED", deliveryStatus: "IN_TRANSIT", firstProductTitle: "Футболка", productTitles: ["Футболка"], totalAmount: 2400 },
  { ...base, id: 1044, status: "COMPLETED", deliveryStatus: "DELIVERED", firstProductTitle: "Брюки", productTitles: ["Брюки"], totalAmount: 7900 },
  { ...base, id: 1045, status: "CANCELED", deliveryStatus: "CANCELLED", firstProductTitle: "Сумка", productTitles: ["Сумка"], totalAmount: 3900 },
];
function label(order: SellerOrderCardListItem) {
  if (order.status === "CANCELED") return "Отменён";
  if (order.status === "COMPLETED") return "Завершён";
  if (order.deliveryStatus === "IN_TRANSIT") return "В пути";
  return "Нужно отправить";
}

export function SellerOrdersExample() {
  const [state, setState] = useState<ExampleState>("ready");
  const [loaded, setLoaded] = useState(3);
  const [notice, setNotice] = useState("");
  function onLink(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest("a");
    if (!link) return;
    event.preventDefault();
    setNotice("Выбран пример заказа — реальные данные не менялись");
  }
  return <div className={styles.example} onClickCapture={onLink} onAuxClickCapture={event => event.preventDefault()}>
    <p>Рабочий список продавца: фильтр, поиск и загрузка следующей части на условных данных</p>
    <SegmentedControl items={states} value={state} onChange={setState} ariaLabel="Состояние списка заказов в примере" />
    {state === "loading" ? <CabinetSkeleton variant="list" compact />
      : state === "error" ? <RequestError message="Не удалось загрузить заказы" onRetry={() => setState("ready")} />
      : <SellerOrdersTab key={state} presentation="cabinet" orders={state === "empty" ? [] : orders.slice(0, loaded)}
        totalElements={state === "empty" ? 0 : orders.length} onLoadMore={state === "ready" && loaded < orders.length ? () => setLoaded(orders.length) : undefined}
        buildSellerStatusLabel={label} showDeliveryLabel={false} />}
    <p className={styles.note} role="status">{notice}</p>
  </div>;
}
