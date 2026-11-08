"use client";

import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { returnAction, type ReturnAction, type ReturnWorkflow } from "../../lib/returns";

const actionLabels: Record<ReturnAction, string> = {
  DOWNLOAD_DOCUMENTS: "Документы для возврата", RESCHEDULE_COURIER: "Перенос курьера",
  RECEIVE: "Подтверждение получения товара", INSPECT: "Проверка товара",
  APPROVE: "Одобрение заявки", REJECT: "Отклонение заявки", REFUND: "Возврат денег",
  SYNC_REFUND: "Сверка возврата денег",
};
const eventLabels = { CREATED: "Заявка создана", INSPECTED: "Товар проверен" };

export function ReturnWorkflowSummary({ workflow, onRefresh }: {
  workflow?: ReturnWorkflow | null; onRefresh?: () => void;
}) {
  const refresh = onRefresh ?? (() => window.location.reload());
  if (!workflow || workflow.version !== 1 || !Array.isArray(workflow.actions) || !Array.isArray(workflow.events))
    return <Banner tone="warning" actions={<Button variant="ghost" onClick={refresh}>Обновить возврат</Button>}>
      Информация о доступных действиях пока недоступна
    </Banner>;
  return <details>
    <summary>Состояние и доступные действия возврата</summary>
    {workflow.events.length > 0 && <ul aria-label="События возврата">{workflow.events.filter(event => event && typeof event.code === "string" && typeof event.occurredAt === "string").map(event => <li key={event.code}>
      {eventLabels[event.code] ?? event.code} · <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("ru-RU")}</time>
    </li>)}</ul>}
    <ul aria-label="Доступность действий возврата">{workflow.actions.filter(item => item && typeof item.code === "string").map(item => {
      const state = returnAction({ workflow }, item.code);
      return <li key={item.code}>{actionLabels[item.code] ?? item.code}: {state.allowed ? "доступно" : state.reason || "Действие недоступно"}</li>;
    })}</ul>
    <Button variant="ghost" onClick={refresh}>Обновить возврат</Button>
  </details>;
}
