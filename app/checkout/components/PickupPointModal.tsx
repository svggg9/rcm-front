"use client";

import type { DeliveryOption } from "../types";
import { Price } from "../../components/ui/Price";
import { SkeletonBlock } from "../../components/ui/SkeletonBlock";
import { PickupPointMap } from "./PickupPointMap";
import styles from "./PickupPointModal.module.css";

type Props = {
  open: boolean;
  loading: boolean;
  points: DeliveryOption[];
  selectedId: string;
  deliveryPrice: number;
  onClose: () => void;
  onSelect: (id: string) => void;
  onConfirm: () => void;
};

export function PickupPointModal({
  open,
  loading,
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
            {loading ? (
              <div
                className={styles.listLoader}
                role="status"
                aria-label="Загрузка пунктов выдачи"
              >
                {Array.from({ length: 6 }, (_, index) => (
                  <div className={styles.skeletonItem} key={index}>
                    <SkeletonBlock as="span" className={styles.skeletonLine} />
                    <SkeletonBlock as="span" className={styles.skeletonLineShort} />
                  </div>
                ))}
              </div>
            ) : selectedPoint ? (
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

                {deliveryPrice > 0 ? (
                  <div className={styles.detailLine}>
                    Стоимость доставки <Price amount={deliveryPrice} />
                  </div>
                ) : null}

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
                  Выбрать этот пункт
                </button>
              </div>
            ) : (
              <div className={styles.list}>
                {points.map((point) => (
                  <button
                    key={point.id}
                    type="button"
                    className={styles.item}
                    onClick={() => onSelect(point.id)}
                  >
                    <span className={styles.itemTitle}>СДЭК • {point.label}</span>

                    {deliveryPrice > 0 ? (
                      <span className={styles.itemMeta}>
                        <Price amount={deliveryPrice} />
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </aside>

          <div className={styles.map}>
            {loading ? (
              <div
                className={styles.mapLoader}
                role="status"
                aria-label="Загрузка карты"
              >
                <span />
              </div>
            ) : (
              <PickupPointMap
                points={points}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
