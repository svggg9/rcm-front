"use client";

import { useState } from "react";

import { EmptyState } from "../../components/ui/EmptyState";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "../../components/ui/StatusBadge";

import styles from "../Admin.module.css";
import { getAdminCdekWebhookPayload } from "../lib/adminApi";
import type {
  AdminCdekWebhookEvent,
  CdekWebhookProcessingStatus,
} from "../types";

type Props = {
  events: AdminCdekWebhookEvent[];
  totalElements: number;
  refreshing: boolean;
  loadingMore: boolean;
  onRefresh: () => void;
  onLoadMore?: () => void;
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

function getProcessingStatusTone(
  value: CdekWebhookProcessingStatus
): StatusBadgeTone {
  switch (value) {
    case "PROCESSED":
      return "success";
    case "FAILED":
      return "danger";
    case "IGNORED":
      return "default";
    case "RECEIVED":
      return "warning";
    default:
      return "default";
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

function RawPayloadDetails({ eventId }: { eventId: number }) {
  const [formattedPayload, setFormattedPayload] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPayload() {
    if (formattedPayload !== null || loading) return;
    setLoading(true);
    setError(null);
    try {
      setFormattedPayload(prettyPayload(await getAdminCdekWebhookPayload(eventId)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить JSON");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details
      className={styles.rawDetails}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          void loadPayload();
        }
      }}
    >
      <summary>Показать JSON</summary>
      {loading ? <span>Загрузка…</span> : null}
      {error ? <span className={styles.cdekError}>{error}</span> : null}
      {formattedPayload !== null ? (
        <pre className={styles.rawPayload}>{formattedPayload}</pre>
      ) : null}
    </details>
  );
}

export function AdminCdekTab({
  events,
  totalElements,
  refreshing,
  loadingMore,
  onRefresh,
  onLoadMore,
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
          icon="truck"
          tone="gold"
          title="Событий пока нет"
          text="Когда СДЭК пришлет webhook, он появится здесь вместе со статусом обработки."
        />
      ) : (
        <>
          <div className={styles.financeTableWrap}>
            <table className={styles.financeTable}>
            <thead>
              <tr>
                <th scope="col">Дата</th>
                <th scope="col">Событие</th>
                <th scope="col">Статус СДЭК</th>
                <th scope="col">Заказ СДЭК</th>
                <th scope="col">Обработка</th>
                <th scope="col">Payload</th>
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
                    <StatusBadge
                      tone={getProcessingStatusTone(event.processingStatus)}
                      size="regular"
                    >
                      {formatProcessingStatus(event.processingStatus)}
                    </StatusBadge>
                    <span>{formatDate(event.processedAt)}</span>
                    {event.processingError ? (
                      <span className={styles.cdekError}>
                        {event.processingError}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <RawPayloadDetails eventId={event.id} />
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <ListLoadMore
            loaded={events.length}
            total={totalElements}
            loading={loadingMore}
            onLoadMore={onLoadMore}
          />
        </>
      )}
    </>
  );
}
