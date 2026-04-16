"use client";

import styles from "../Seller.module.css";

import type { SellerOrder } from "../types";

type Props = {
  order: SellerOrder;
  shipping: boolean;
  canShip: boolean;
  onBack: () => void;
  onShip: () => void;
  formatOrderStatus: (status: SellerOrder["status"]) => string;
  formatPaymentStatus: (status: SellerOrder["paymentStatus"]) => string;
  formatDeliveryStatus: (status: SellerOrder["deliveryStatus"]) => string;
  buildSellerStatusLabel: (order: SellerOrder) => string;
};

export function SellerOrderDetails({
  order,
  shipping,
  canShip,
  onBack,
  onShip,
  formatOrderStatus,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildSellerStatusLabel,
}: Props) {
  return (
    <>
      <div className={styles.detailsHeader}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          Назад
        </button>

        <h1 className={styles.sectionTitleNoMargin}>Заказ #{order.id}</h1>
      </div>

      <div className={styles.detailsMeta}>
        <span className={styles.statusBadge}>{buildSellerStatusLabel(order)}</span>
        <span className={styles.dot}>·</span>
        <span className={styles.muted}>
          {new Date(order.createdAt).toLocaleString("ru-RU")}
        </span>
      </div>

      <div className={styles.detailsLayout}>
        <section className={styles.detailsSection}>
          <h2 className={styles.detailsSectionTitle}>Товары</h2>

          <div className={styles.detailsItems}>
            {order.items.map((item, index) => (
              <div key={`${item.sku}-${index}`} className={styles.detailsItemRow}>
                <div className={styles.detailsItemImageWrap}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productTitle}
                      className={styles.detailsItemImage}
                    />
                  ) : (
                    <div className={styles.detailsItemImagePlaceholder} />
                  )}
                </div>

                <div className={styles.detailsItemMain}>
                  <div className={styles.detailsItemTitle}>{item.productTitle}</div>

                  <div className={styles.detailsItemMeta}>Размер: {item.size}</div>
                  <div className={styles.detailsItemMeta}>Цвет: {item.color}</div>
                  <div className={styles.detailsItemMeta}>Кол-во: {item.quantity}</div>
                  <div className={styles.detailsItemMeta}>
                    Цена: {item.price.toLocaleString()} ₽
                  </div>
                  <div className={styles.detailsItemMeta}>SKU: {item.sku}</div>
                </div>

                <div className={styles.detailsItemTotal}>
                  {item.lineTotal.toLocaleString()} ₽
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.detailsAside}>
          <section className={styles.detailsSection}>
            <h2 className={styles.detailsSectionTitle}>Информация о заказе</h2>

            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Номер</span>
                <span className={styles.infoValue}>#{order.id}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Группа</span>
                <span className={styles.infoValue}>{order.orderGroupId}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Статус заказа</span>
                <span className={styles.infoValue}>
                  {formatOrderStatus(order.status)}
                </span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Статус оплаты</span>
                <span className={styles.infoValue}>
                  {formatPaymentStatus(order.paymentStatus)}
                </span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Статус доставки</span>
                <span className={styles.infoValue}>
                  {formatDeliveryStatus(order.deliveryStatus)}
                </span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Создан</span>
                <span className={styles.infoValue}>
                  {new Date(order.createdAt).toLocaleString("ru-RU")}
                </span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Сумма</span>
                <span className={styles.infoValue}>
                  {order.totalAmount.toLocaleString()} ₽
                </span>
              </div>
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={styles.detailsSectionTitle}>Доставка</h2>

            <div className={styles.infoGrid}>
              <div className={styles.infoRowColumn}>
                <span className={styles.infoLabel}>Способ доставки</span>
                <span className={styles.infoValue}>{order.deliveryMethod}</span>
              </div>

              <div className={styles.infoRowColumn}>
                <span className={styles.infoLabel}>Адрес / ПВЗ</span>
                <span className={styles.infoValue}>{order.deliveryAddress}</span>
              </div>

              {order.trackingNumber ? (
                <div className={styles.infoRowColumn}>
                  <span className={styles.infoLabel}>Трек-номер</span>
                  <span className={styles.infoValue}>{order.trackingNumber}</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={styles.detailsSectionTitle}>Получатель</h2>

            <div className={styles.infoGrid}>
              <div className={styles.infoRowColumn}>
                <span className={styles.infoLabel}>Имя</span>
                <span className={styles.infoValue}>{order.recipientName}</span>
              </div>

              <div className={styles.infoRowColumn}>
                <span className={styles.infoLabel}>Телефон</span>
                <span className={styles.infoValue}>{order.recipientPhone}</span>
              </div>
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={styles.detailsSectionTitle}>Действия продавца</h2>

            <div className={styles.detailsActions}>
              {canShip ? (
                <button
                  type="button"
                  onClick={onShip}
                  disabled={shipping}
                  className={styles.primaryBtn}
                >
                  {shipping ? "Отмечаем…" : "Отправил"}
                </button>
              ) : (
                <div className={styles.muted}>
                  Для текущего статуса отправка недоступна
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}