"use client";

import styles from "../Seller.module.css";

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
  shipping: boolean;
  onBack: () => void;
  onShip: () => void;
  formatStatus: (status: Order["status"]) => string;
};

export function SellerOrderDetails({
  order,
  shipping,
  onBack,
  onShip,
  formatStatus,
}: Props) {
  return (
    <>
      <div className={styles.detailsHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={onBack}
        >
          Назад
        </button>

        <h1 className={styles.sectionTitleNoMargin}>Заказ #{order.id}</h1>
      </div>

      <div className={styles.detailsMeta}>
        <span className={styles.statusBadge}>{formatStatus(order.status)}</span>
        <span className={styles.dot}>·</span>
        <span className={styles.muted}>
          {new Date(order.createdAt).toLocaleString()}
        </span>
      </div>

      <div className={styles.detailsLayout}>
        <section className={styles.detailsSection}>
          <h2 className={styles.detailsSectionTitle}>Товары</h2>

          <div className={styles.detailsItems}>
            {order.items.map((item, index) => (
              <div key={index} className={styles.detailsItemRow}>
                <div className={styles.detailsItemImageWrap}>
                  <div className={styles.detailsItemImagePlaceholder} />
                </div>

                <div className={styles.detailsItemMain}>
                  <div className={styles.detailsItemTitle}>{item.productTitle}</div>

                  <div className={styles.detailsItemMeta}>
                    Размер: {item.size}
                  </div>

                  <div className={styles.detailsItemMeta}>
                    Цвет: {item.color}
                  </div>

                  <div className={styles.detailsItemMeta}>
                    Кол-во: {item.quantity}
                  </div>

                  <div className={styles.detailsItemMeta}>
                    Цена: {item.price.toLocaleString()} ₽
                  </div>
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
                <span className={styles.infoLabel}>Статус</span>
                <span className={styles.infoValue}>{formatStatus(order.status)}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Создан</span>
                <span className={styles.infoValue}>
                  {new Date(order.createdAt).toLocaleString()}
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
                <span className={styles.infoLabel}>Адрес / ПВЗ</span>
                <span className={styles.infoValue}>
                  Пока не подключено к backend
                </span>
              </div>

              <div className={styles.infoRowColumn}>
                <span className={styles.infoLabel}>Комментарий</span>
                <span className={styles.infoValue}>
                  Поля доставки добавим после расширения API заказа
                </span>
              </div>
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={styles.detailsSectionTitle}>Получатель</h2>

            <div className={styles.infoGrid}>
              <div className={styles.infoRowColumn}>
                <span className={styles.infoLabel}>Имя</span>
                <span className={styles.infoValue}>Пока не подключено</span>
              </div>

              <div className={styles.infoRowColumn}>
                <span className={styles.infoLabel}>Телефон</span>
                <span className={styles.infoValue}>Пока не подключено</span>
              </div>
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={styles.detailsSectionTitle}>Действия продавца</h2>

            <div className={styles.detailsActions}>
              {order.status === "PAID" ? (
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
                  Для этого статуса действий пока нет
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}