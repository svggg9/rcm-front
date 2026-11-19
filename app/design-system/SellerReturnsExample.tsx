"use client";

import { useState, type MouseEvent } from "react";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { SellerReturnsListView } from "../seller/components/SellerReturnsTab";
import type { SellerReturnGroup } from "../seller/lib/sellerReturnListPresentation";
import type { SellerReturnListItem } from "../lib/returns";
import styles from "./SellerOrdersExample.module.css";

type ExampleState = "ready" | "empty" | "loading" | "error" | "moreError";
const states: { value: ExampleState; label: string }[] = [
  { value: "ready", label: "Возвраты" }, { value: "empty", label: "Пусто" }, { value: "loading", label: "Загрузка" },
  { value: "error", label: "Ошибка" }, { value: "moreError", label: "Ошибка дозагрузки" },
];
const base: SellerReturnListItem = {
  id: 101, orderId: 1042, productId: 1, variantId: 1, productTitle: "Рубашка из хлопка", sku: "DEMO-1",
  quantity: 1, reason: "DOES_NOT_FIT", comment: null, status: "REQUESTED", cdekNumber: null,
  requestedAmount: 5900, approvedRefundAmount: null, sellerComment: null, resellable: null,
  createdAt: "2026-11-07T12:00:00Z", updatedAt: "2026-11-07T12:00:00Z",
};
const returns: SellerReturnListItem[] = [
  base,
  { ...base, id: 102, orderId: 1043, productTitle: "Футболка", reason: "DEFECT", status: "RECEIVED", cdekNumber: "DEMO-102" },
  { ...base, id: 103, orderId: 1044, productTitle: "Брюки", status: "REFUNDED", approvedRefundAmount: 5900 },
];

export function SellerReturnsExample() {
  const [state, setState] = useState<ExampleState>("ready");
  const [group, setGroup] = useState<SellerReturnGroup>("all");
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(2);
  const [notice, setNotice] = useState("");
  function onLink(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target as HTMLElement).closest("a")) return;
    event.preventDefault();
    setNotice("Выбран пример возврата — реальные данные не менялись");
  }
  const requests = state === "empty" || state === "loading" || state === "error" ? [] : returns.slice(0, loaded);
  return <div className={styles.example} onClickCapture={onLink} onAuxClickCapture={event => event.preventDefault()}>
    <p>Рабочий список продавца с условными возвратами, поиском и группами состояний</p>
    <SegmentedControl items={states} value={state} onChange={setState} ariaLabel="Состояние списка возвратов в примере" />
    <SellerReturnsListView requests={requests} group={group} query={query} loading={state === "loading"} loadingMore={false}
      hasMore={(state === "ready" || state === "moreError") && loaded < returns.length} totalItems={state === "empty" ? 0 : returns.length}
      error={state === "error" ? "initial" : state === "moreError" ? "more" : null}
      onChangeGroup={setGroup} onChangeQuery={setQuery} onReset={() => { setGroup("all"); setQuery(""); }}
      onRetry={() => { setState("ready"); if (state === "moreError") setLoaded(returns.length); }} onLoadMore={() => setLoaded(returns.length)} />
    <p className={styles.note} role="status">{notice}</p>
  </div>;
}
