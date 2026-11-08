"use client";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { type OrderAction, type OrderWorkflow } from "../../lib/order-contract";
import { useOrderActions } from "../../lib/useOrderActions";

const actionLabels: Record<OrderAction, string> = {
  PAY: "Оплата покупки", CANCEL: "Отмена заказа", COMPLETE: "Подтверждение получения",
  REQUEST_RETURN: "Оформление возврата", SHIP: "Передача в доставку", SET_TRACKING: "Изменение трек-номера",
  DOWNLOAD_LABEL: "Накладная СДЭК", REFUND: "Возврат денег", CANCEL_DELIVERY: "Отмена доставки",
};
const eventLabels = {
  CREATED: "Заказ создан", PAID: "Оплата подтверждена", CANCELLATION_REQUESTED: "Запрошена отмена",
  CANCELLED: "Заказ отменён", DELIVERED: "Заказ получен",
};
export function OrderWorkflowSummary({ workflow }: { workflow?: OrderWorkflow | null }) {
  const action = useOrderActions({ workflow });
  if (!workflow || workflow.version !== 1) return <Banner tone="warning"
    actions={<Button variant="ghost" onClick={() => window.location.reload()}>Обновить заказ</Button>}>
    Информация о доступных действиях пока недоступна</Banner>;
  return <details>
    <summary>Состояние и доступные действия</summary>
    {workflow.events.length > 0 && <ul aria-label="События заказа">{workflow.events.map(event => <li key={event.code}>
      {eventLabels[event.code]} · <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("ru-RU")}</time>
    </li>)}</ul>}
    <ul aria-label="Доступность действий">{workflow.actions.map(item => {
      const state = action(item.code);
      return <li key={item.code}>{actionLabels[item.code]}: {state.allowed ? "доступно" : state.reason}
        {item.scope === "ORDER_GROUP" ? " · для всей покупки" : ""}</li>;
    })}</ul>
    <Button variant="ghost" onClick={() => window.location.reload()}>Обновить заказ</Button>
  </details>;
}
