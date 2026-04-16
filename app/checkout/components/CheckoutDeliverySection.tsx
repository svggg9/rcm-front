"use client";

import type {
  DeliveryMethod,
  DeliveryOffer,
  PickupPoint,
} from "../types";
import styles from "../Checkout.module.css";

type Props = {
  deliveryMethod: DeliveryMethod;
  pickupSearchQuery: string;
  pickupPoints: PickupPoint[];
  selectedPickupPoint: PickupPoint | null;
  deliveryOffers: DeliveryOffer[];
  selectedOffer: DeliveryOffer | null;
  pickupSearchLoading: boolean;
  offersLoading: boolean;
  pickupSearchError: string | null;
  offersError: string | null;
  deliveryAddress: string;
  comment: string;
  confirmed: boolean;
  expanded: boolean;
  enabled: boolean;
  onEdit: () => void;
  onConfirm: () => void;
  onDeliveryMethodChange: (value: DeliveryMethod) => void;
  onPickupSearchQueryChange: (value: string) => void;
  onSearchPickupPoints: () => void;
  onPickupPointSelect: (value: PickupPoint) => void;
  onOfferSelect: (value: DeliveryOffer) => void;
  onDeliveryAddressChange: (value: string) => void;
  onCommentChange: (value: string) => void;
};

function formatMoney(amount?: number | null, currency?: string | null): string {
  if (typeof amount !== "number") {
    return "—";
  }

  const value = amount.toLocaleString("ru-RU", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${value} ${currency || "RUB"}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CheckoutDeliverySection({
  deliveryMethod,
  pickupSearchQuery,
  pickupPoints,
  selectedPickupPoint,
  deliveryOffers,
  selectedOffer,
  pickupSearchLoading,
  offersLoading,
  pickupSearchError,
  offersError,
  deliveryAddress,
  comment,
  confirmed,
  expanded,
  enabled,
  onEdit,
  onConfirm,
  onDeliveryMethodChange,
  onPickupSearchQueryChange,
  onSearchPickupPoints,
  onPickupPointSelect,
  onOfferSelect,
  onDeliveryAddressChange,
  onCommentChange,
}: Props) {
  const summaryAddress =
    deliveryMethod === "PICKUP_POINT"
      ? selectedPickupPoint?.fullAddress ?? "Пункт выдачи не выбран"
      : deliveryAddress || "Адрес не указан";

  const summaryHint =
    deliveryMethod === "PICKUP_POINT"
      ? selectedPickupPoint?.name || "Самовывоз из ПВЗ"
      : "Курьерская доставка";

  const selectedOfferPrice =
    selectedOffer?.pricingTotalAmount != null
      ? formatMoney(
          selectedOffer.pricingTotalAmount,
          selectedOffer.pricingTotalCurrency
        )
      : null;

  return (
    <section
      className={`${styles.section} ${!enabled ? styles.sectionDisabled : ""}`}
    >
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.stepBadge}>2</span>
          <h2 className={styles.sectionTitle}>Доставка</h2>
        </div>

        {confirmed ? (
          <button
            type="button"
            onClick={onEdit}
            className={styles.sectionEditBtn}
          >
            Изменить
          </button>
        ) : null}
      </div>

      {!expanded && confirmed ? (
        <div className={styles.sectionSummary}>
          <div>
            {deliveryMethod === "PICKUP_POINT" ? "Пункт выдачи" : "Курьер"}
          </div>
          <div className={styles.sectionSummaryMuted}>{summaryAddress}</div>
          {summaryHint ? (
            <div className={styles.sectionSummaryMuted}>{summaryHint}</div>
          ) : null}
          {selectedOfferPrice ? (
            <div className={styles.sectionSummaryMuted}>
              Доставка: {selectedOfferPrice}
            </div>
          ) : null}
          {comment.trim() ? (
            <div className={styles.sectionSummaryMuted}>
              Комментарий: {comment}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.sectionBody}>
          <div className={styles.paymentMethods}>
            <button
              type="button"
              className={`${styles.paymentOption} ${
                deliveryMethod === "PICKUP_POINT"
                  ? styles.paymentOptionActive
                  : ""
              }`}
              onClick={() => onDeliveryMethodChange("PICKUP_POINT")}
              disabled={!enabled}
            >
              <div className={styles.paymentTitle}>Пункт выдачи</div>
              <div className={styles.paymentText}>
                Выбор ПВЗ и варианта доставки
              </div>
            </button>

            <button
              type="button"
              className={`${styles.paymentOption} ${
                deliveryMethod === "COURIER" ? styles.paymentOptionActive : ""
              }`}
              onClick={() => onDeliveryMethodChange("COURIER")}
              disabled={!enabled}
            >
              <div className={styles.paymentTitle}>Курьер</div>
              <div className={styles.paymentText}>
                Пока без интеграции, адрес вводится вручную
              </div>
            </button>
          </div>

          {deliveryMethod === "PICKUP_POINT" ? (
            <>
              <label className={styles.field}>
                <span className={styles.label}>Поиск ПВЗ</span>
                <div className={styles.promoRow}>
                  <input
                    className={styles.input}
                    value={pickupSearchQuery}
                    onChange={(event) =>
                      onPickupSearchQueryChange(event.target.value)
                    }
                    placeholder="Москва, Ленинградский проспект"
                    disabled={!enabled || pickupSearchLoading}
                  />
                  <button
                    type="button"
                    className={styles.promoBtn}
                    onClick={onSearchPickupPoints}
                    disabled={
                      !enabled ||
                      pickupSearchLoading ||
                      !pickupSearchQuery.trim()
                    }
                  >
                    {pickupSearchLoading ? "Ищем…" : "Найти ПВЗ"}
                  </button>
                </div>
              </label>

              {pickupSearchError ? (
                <div className={styles.error}>{pickupSearchError}</div>
              ) : null}

              {pickupPoints.length > 0 ? (
                <div className={styles.summaryItems}>
                  {pickupPoints.map((point) => {
                    const isSelected = selectedPickupPoint?.id === point.id;

                    return (
                      <button
                        key={point.id}
                        type="button"
                        className={`${styles.paymentOption} ${
                          isSelected ? styles.paymentOptionActive : ""
                        }`}
                        onClick={() => onPickupPointSelect(point)}
                        disabled={!enabled || offersLoading}
                        style={{ textAlign: "left" }}
                      >
                        <div className={styles.paymentTitle}>
                          {point.name || "ПВЗ"}
                        </div>
                        <div className={styles.paymentText}>
                          {point.fullAddress}
                        </div>
                        {point.instruction ? (
                          <div className={styles.paymentText}>
                            {point.instruction}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {selectedPickupPoint ? (
                <div className={styles.deliveryHint}>
                  Выбран ПВЗ: {selectedPickupPoint.fullAddress}
                </div>
              ) : null}

              {offersLoading ? (
                <div className={styles.deliveryHint}>
                  Загружаем варианты доставки…
                </div>
              ) : null}

              {offersError ? (
                <div className={styles.error}>{offersError}</div>
              ) : null}

              {deliveryOffers.length > 0 ? (
                <div className={styles.summaryItems}>
                  {deliveryOffers.map((offer) => {
                    const isSelected = selectedOffer?.offerId === offer.offerId;

                    return (
                      <button
                        key={offer.offerId}
                        type="button"
                        className={`${styles.paymentOption} ${
                          isSelected ? styles.paymentOptionActive : ""
                        }`}
                        onClick={() => onOfferSelect(offer)}
                        disabled={!enabled}
                        style={{ textAlign: "left" }}
                      >
                        <div className={styles.paymentTitle}>
                          {formatMoney(
                            offer.pricingTotalAmount,
                            offer.pricingTotalCurrency
                          )}
                        </div>
                        <div className={styles.paymentText}>
                          Доставка: {formatDateTime(offer.deliveryFrom)} —{" "}
                          {formatDateTime(offer.deliveryTo)}
                        </div>
                        <div className={styles.paymentText}>
                          Забор: {formatDateTime(offer.pickupFrom)} —{" "}
                          {formatDateTime(offer.pickupTo)}
                        </div>
                        {offer.expiresAt ? (
                          <div className={styles.paymentText}>
                            Действует до: {formatDateTime(offer.expiresAt)}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </>
          ) : (
            <label className={styles.field}>
              <span className={styles.label}>Адрес доставки</span>
              <input
                className={styles.input}
                value={deliveryAddress}
                onChange={(event) => onDeliveryAddressChange(event.target.value)}
                placeholder="Москва, ул. Тверская, 12, кв. 8"
                disabled={!enabled}
              />
            </label>
          )}

          <label className={styles.field}>
            <span className={styles.label}>Комментарий для доставки</span>
            <input
              className={styles.input}
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              placeholder="Например: позвонить за 10 минут"
              disabled={!enabled}
            />
          </label>

          <div className={styles.deliveryHint}>
            Сейчас основной сценарий — доставка в ПВЗ. Курьерский вариант можно
            оставить как fallback.
          </div>

          <button
            type="button"
            onClick={onConfirm}
            className={styles.confirmBtn}
            disabled={!enabled}
          >
            Подтвердить доставку
          </button>
        </div>
      )}
    </section>
  );
}