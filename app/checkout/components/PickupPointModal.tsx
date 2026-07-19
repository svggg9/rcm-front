"use client";

import type { DeliveryOption } from "../types";
import { Price } from "../../components/ui/Price";
import { PickupPointMap } from "./PickupPointMap";
import styles from "./PickupPointModal.module.css";

type Props = {
  open: boolean;
  points: DeliveryOption[];
  selectedId: string;
  deliveryPrice: number;
  onClose: () => void;
  onSelect: (id: string) => void;
  onConfirm: () => void;
};

export function PickupPointModal({
  open,
  points,
  selectedId,
  deliveryPrice,
  onClose,
  onSelect,
  onConfirm,
}: Props) {
  if (!open) return null;

  const selectedPoint = selectedId.trim()
    ? points.find((point) => point.id === selectedId) ?? null
    : null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={styles.modal}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Выберите пункт выдачи</h2>
            <p className={styles.subtitle}>Пункты СДЭК в выбранном городе</p>
          </div>

          <button type="button" className={styles.closeButton} onClick={onClose}>
            Закрыть
          </button>
        </header>

        <div className={styles.body}>
          <aside className={styles.panel}>
            {selectedPoint ? (
              <div className={styles.details}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => onSelect("")}
                >
                  ← Назад к списку
                </button>

                <div className={styles.provider}>СДЭК</div>

                <div className={styles.address}>{selectedPoint.label}</div>

                <div className={styles.detailLine}>
                  Пн — пт: 10:00-21:00; сб, вс: 10:00-20:00
                </div>

                <div className={styles.detailLine}>
                  Доставка — в воскресенье {deliveryPrice > 0 ? <Price amount={deliveryPrice} /> : "рассчитаем"}
                </div>

                <div className={styles.detailLine}>Срок хранения 5 дней</div>
                <div className={styles.detailLine}>Есть примерка</div>

                <div className={styles.detailLine}>
                  Банковская карта, наличные, онлайн-оплата
                </div>

                {selectedPoint.hint ? (
                  <>
                    <div className={styles.detailSubtitle}>Как добраться</div>
                    <div className={styles.detailLine}>{selectedPoint.hint}</div>
                  </>
                ) : null}

                <button
                  type="button"
                  className={styles.confirmButton}
                  onClick={onConfirm}
                >
                  Заберу здесь
                </button>
              </div>
            ) : (
              <div className={styles.list}>
                {points.length === 0 ? (
                  <div className={styles.empty}>
                    Пункты выдачи не найдены. Попробуйте выбрать другой город.
                  </div>
                ) : (
                  points.map((point) => (
                    <button
                      key={point.id}
                      type="button"
                      className={styles.item}
                      onClick={() => onSelect(point.id)}
                    >
                      <span className={styles.itemTitle}>
                        СДЭК • {point.label}
                      </span>

                      <span className={styles.itemMeta}>Есть примерка</span>

                      <span className={styles.itemMeta}>
                        Доставка — в воскресенье {deliveryPrice > 0 ? <Price amount={deliveryPrice} /> : "рассчитаем"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </aside>

          <div className={styles.map}>
            <PickupPointMap
              points={points}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
