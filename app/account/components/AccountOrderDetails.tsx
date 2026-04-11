"use client";

import styles from "../Account.module.css";

type OrderItem = {
  productTitle: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  lineTotal: number;
};

type Order = {
  id: number;
  status: "NEW" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

type Props = {
  order: Order;
  onBack: () => void;
  formatStatus: (status: Order["status"]) => string;
};

export function AccountOrderDetails({
  order,
  onBack,
  formatStatus,
}: Props) {
  return (
    <>
      <div className={styles.orderDetailsHeader}>
        <button
          type="button"
          className={styles.orderBackButton}
          onClick={onBack}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path
              d="M10 2.5L3 11.5L10 20.5M21 11.5H3"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </button>

        <div className={styles.sectionTitleNoMargin}>Заказ #{order.id}</div>
      </div>

      <section className={styles.orderDetailsStatusCard}>
        <div className={styles.orderDetailsStatusLine}>
          <span className={styles.orderStatusLarge}>
            {formatStatus(order.status)}
          </span>
          <span className={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
      </section>

      <section className={styles.orderDetailsSection}>
        <h2 className={styles.orderDetailsTitle}>Товары</h2>

        <div className={styles.orderDetailsProducts}>
          {order.items.map((item, index) => (
            <div
              key={`${item.productTitle}-${index}`}
              className={styles.orderDetailsProduct}
            >
              <div className={styles.orderDetailsImageWrap}>
                <div className={styles.orderDetailsImagePlaceholder} />
              </div>

              <div className={styles.orderDetailsProductInfo}>
                <div className={styles.orderDetailsProductTitle}>
                  {item.productTitle}
                </div>

                <div className={styles.orderDetailsMeta}>
                  {item.size} · {item.color}
                </div>

                <div className={styles.orderDetailsMeta}>
                  {item.quantity} × {item.price.toLocaleString()} ₽
                </div>

                <div className={styles.orderDetailsPrice}>
                  {item.lineTotal.toLocaleString()} ₽
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.orderDetailsBottomGrid}>
        <section className={styles.orderDetailsSection}>
          <h2 className={styles.orderDetailsTitle}>Детали оплаты</h2>

          <div className={styles.orderDetailsRows}>
            <div className={styles.orderDetailsRow}>
              <span>{order.items.length} товар(ов)</span>
              <span>{order.totalAmount.toLocaleString()} ₽</span>
            </div>

            <div className={styles.orderDetailsRow}>
              <span>Доставка</span>
              <span>Бесплатно</span>
            </div>
          </div>

          <div className={styles.orderDetailsTotal}>
            <span>Итого</span>
            <span>{order.totalAmount.toLocaleString()} ₽</span>
          </div>
        </section>

        <section className={styles.orderDetailsSection}>
          <h2 className={styles.orderDetailsTitle}>Детали доставки</h2>

          <div className={styles.orderDeliveryBlock}>
            <div className={styles.orderDeliveryItem}>
              <div className={styles.infoLabel}>Адрес / пункт выдачи</div>
              <div className={styles.infoValue}>
                Тестовый адрес доставки будет подключён позже
              </div>
            </div>

            <div className={styles.orderDeliveryItem}>
              <div className={styles.infoLabel}>Получатель</div>
              <div className={styles.infoValue}>Данные получателя появятся позже</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}