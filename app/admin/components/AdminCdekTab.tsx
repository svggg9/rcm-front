import { EmptyState } from "../../components/ui/EmptyState";

import styles from "../Admin.module.css";
import type {
  AdminCdekWebhookEvent,
  CdekWebhookProcessingStatus,
} from "../types";

type Props = {
  events: AdminCdekWebhookEvent[];
  totalElements: number;
  refreshing: boolean;
  onRefresh: () => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatProcessingStatus(value: CdekWebhookProcessingStatus) {
  switch (value) {
    case "PROCESSED":
      return "Обработано";
    case "FAILED":
      return "Ошибка";
    case "IGNORED":
      return "Игнор";
    case "RECEIVED":
      return "Получено";
    default:
      return value;
  }
}

function processingStatusClass(value: CdekWebhookProcessingStatus) {
  switch (value) {
    case "PROCESSED":
      return styles.statusProcessed;
    case "FAILED":
      return styles.statusFailed;
    case "IGNORED":
      return styles.statusIgnored;
    case "RECEIVED":
      return styles.statusReceived;
    default:
      return "";
  }
}

function formatFlag(value: boolean | null) {
  if (value === true) return "да";
  if (value === false) return "нет";
  return "—";
}

function prettyPayload(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function AdminCdekTab({
  events,
  totalElements,
  refreshing,
  onRefresh,
}: Props) {
  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={`${styles.sectionTitleNoMargin} textTitle`}>СДЭК</h1>
          <div className={`${styles.muted} textCaption`}>
            Webhook-событий: {totalElements}
          </div>
        </div>

        <button
          type="button"
          className={`${styles.refreshBtn} textButton`}
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Обновляем..." : "Обновить"}
        </button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="Событий пока нет"
          text="Когда СДЭК пришлет webhook, он появится здесь вместе со статусом обработки."
        />
      ) : (
        <div className={styles.financeTableWrap}>
          <table className={styles.financeTable}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Событие</th>
                <th>Статус СДЭК</th>
                <th>Заказ СДЭК</th>
                <th>Обработка</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <div>{formatDate(event.receivedAt)}</div>
                    <span>id {event.id}</span>
                  </td>
                  <td>
                    <div>{event.eventType || "—"}</div>
                    <span>
                      return {formatFlag(event.isReturn)} · reverse{" "}
                      {formatFlag(event.isReverse)} · client{" "}
                      {formatFlag(event.isClientReturn)}
                    </span>
                  </td>
                  <td>
                    <div>{event.statusCode || "—"}</div>
                    <span>{event.statusReasonCode || "—"}</span>
                  </td>
                  <td>
                    <div>{event.cdekOrderCode || "—"}</div>
                    <span>{event.cdekOrderUuid || "—"}</span>
                  </td>
                  <td>
                    <div className={processingStatusClass(event.processingStatus)}>
                      {formatProcessingStatus(event.processingStatus)}
                    </div>
                    <span>{formatDate(event.processedAt)}</span>
                    {event.processingError ? (
                      <span className={styles.cdekError}>
                        {event.processingError}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <details className={styles.rawDetails}>
                      <summary>Показать JSON</summary>
                      <pre className={styles.rawPayload}>
                        {prettyPayload(event.rawPayload)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
