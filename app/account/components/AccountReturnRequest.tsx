"use client";

import { useMemo, useState } from "react";

import { Button } from "../../components/ui/Button";
import {
  createOrderReturn,
  returnReasonLabels,
  returnStatusLabels,
  type ReturnReason,
  type ReturnRequest,
} from "../../lib/returns";
import type { Order } from "../types";
import styles from "./AccountReturnRequest.module.css";

type Props = {
  order: Order;
  existingReturns: ReturnRequest[];
  onCreated: (request: ReturnRequest) => void;
};

export function AccountReturnRequest({
  order,
  existingReturns,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [itemKey, setItemKey] = useState("");
  const [reason, setReason] = useState<ReturnReason>("DEFECT");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableItems = useMemo(
    () =>
      order.items.filter(
        (item) =>
          !existingReturns.some(
            (request) =>
              request.productId === item.productId &&
              request.variantId === item.variantId &&
              request.status !== "REJECTED"
          )
      ),
    [existingReturns, order.items]
  );

  const selectedItem = availableItems.find(
    (item) => `${item.productId}:${item.variantId}` === itemKey
  );

  async function submit() {
    if (!selectedItem || submitting) return;
    if (photos.length === 0) {
      setError("Добавьте хотя бы одну фотографию товара");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const request = await createOrderReturn({
        orderId: order.id,
        productId: selectedItem.productId,
        variantId: selectedItem.variantId,
        reason,
        comment,
        photos,
      });
      onCreated(request);
      setOpen(false);
      setItemKey("");
      setComment("");
      setPhotos([]);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось создать заявку"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {existingReturns.map((request) => (
        <div key={request.id} className={styles.request}>
          <div>
            <strong>{request.productTitle}</strong>
            <span>{returnReasonLabels[request.reason]}</span>
          </div>
          <span className={styles.status}>
            {returnStatusLabels[request.status]}
          </span>
          {request.adminComment ? <p>{request.adminComment}</p> : null}
          {request.trackingUrl ? (
            <a href={request.trackingUrl} target="_blank" rel="noreferrer">
              Отследить возврат
            </a>
          ) : null}
        </div>
      ))}

      {!open && availableItems.length > 0 ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Оформить возврат
        </Button>
      ) : null}

      {open ? (
        <div className={styles.form}>
      <div className={styles.heading}>
        <strong>Заявка на возврат</strong>
        <span>В одной заявке можно вернуть одну позицию.</span>
      </div>

      <label className={styles.field}>
        <span>Товар</span>
        <select
          value={itemKey}
          onChange={(event) => setItemKey(event.target.value)}
        >
          <option value="">Выберите позицию</option>
          {availableItems.map((item) => (
            <option
              key={`${item.productId}:${item.variantId}`}
              value={`${item.productId}:${item.variantId}`}
            >
              {item.productTitle} · {item.size} · {item.color}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Причина</span>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value as ReturnReason)}
        >
          {Object.entries(returnReasonLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Комментарий</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={1000}
        />
      </label>

      <label className={styles.field}>
        <span>Фотографии — до 5 файлов</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) =>
            setPhotos(Array.from(event.target.files ?? []).slice(0, 5))
          }
        />
      </label>

      {photos.length > 0 ? (
        <span className={styles.files}>{photos.map((file) => file.name).join(", ")}</span>
      ) : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={() => void submit()}
          disabled={!selectedItem || submitting}
        >
          Отправить заявку
        </Button>
        <Button
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={submitting}
        >
          Отмена
        </Button>
      </div>
        </div>
      ) : null}
    </div>
  );
}
