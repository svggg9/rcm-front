"use client";
import { useState } from "react";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { DisclosureSection } from "../ui/DisclosureSection";
import { type OrderAction, type OrderWorkflow } from "../../lib/order-contract";
import { useOrderActions } from "../../lib/useOrderActions";
import styles from "./OrderWorkflowSummary.module.css";

const actionLabels: Record<OrderAction, string> = {
  PAY: "Оплата покупки", CANCEL: "Отмена заказа", COMPLETE: "Подтверждение получения",
  REQUEST_RETURN: "Оформление возврата", SHIP: "Передача в доставку", SET_TRACKING: "Изменение трек-номера",
  DOWNLOAD_LABEL: "Накладная СДЭК", REFUND: "Возврат денег", CANCEL_DELIVERY: "Отмена доставки",
};
const eventLabels = {
  CREATED: "Заказ создан", PAID: "Оплата подтверждена", CANCELLATION_REQUESTED: "Запрошена отмена",
  CANCELLED: "Заказ отменён", DELIVERED: "Заказ получен",
};
export function OrderWorkflowSummary({ workflow, onRefresh }: { workflow?: OrderWorkflow | null; onRefresh?: () => void }) {
  const [open, setOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const action = useOrderActions({ workflow });
  const refresh = onRefresh ?? (() => window.location.reload());
  if (!workflow || workflow.version !== 1) return <Banner tone="warning"
    actions={<Button variant="ghost" onClick={refresh}>Обновить заказ</Button>}>
    Информация о доступных действиях пока недоступна</Banner>;
  if (workflow.audience === "BUYER") return <DisclosureSection title="История и действия" open={open} onOpenChange={setOpen}>
    {workflow.events.length > 0 ? <ul aria-label="События заказа" className={styles.events}>{workflow.events.map(event => <li key={event.code}>
      <span>{eventLabels[event.code]}</span>
      <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}</time>
    </li>)}</ul> : <p className={styles.empty}>Событий пока нет</p>}
    <DisclosureSection title="Доступность действий" open={actionsOpen} onOpenChange={setActionsOpen}>
      <ul aria-label="Доступность действий" className={styles.actions}>{workflow.actions.map(item => {
        const state = action(item.code);
        return <li key={item.code}><span>{actionLabels[item.code]}{item.scope === "ORDER_GROUP" ? " (для всей покупки)" : ""}</span>
          <span>{state.allowed ? "Доступно" : state.reason || "Действие недоступно"}</span></li>;
      })}</ul>
    </DisclosureSection>
    <Button variant="ghost" onClick={refresh}>Обновить заказ</Button>
  </DisclosureSection>;
  return <details>
    <summary>Состояние и доступные действия</summary>
    {workflow.events.length > 0 && <ul aria-label="События заказа">{workflow.events.map(event => <li key={event.code}>
      {eventLabels[event.code]}, <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("ru-RU")}</time>
    </li>)}</ul>}
    <ul aria-label="Доступность действий">{workflow.actions.map(item => {
      const state = action(item.code);
      return <li key={item.code}>{actionLabels[item.code]}: {state.allowed ? "доступно" : state.reason}
        {item.scope === "ORDER_GROUP" ? " (для всей покупки)" : ""}</li>;
    })}</ul>
    <Button variant="ghost" onClick={refresh}>Обновить заказ</Button>
  </details>;
}
