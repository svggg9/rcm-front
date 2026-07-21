"use client";

import Link from "next/link";

import { Icon, type IconName } from "../../components/ui/Icon";
import type {
  SellerBrand,
  SellerFinanceSummary,
  SellerOrderListItem,
  SellerProductListItem,
} from "../types";

import styles from "./SellerHomeTab.module.css";

type Props = {
  products: SellerProductListItem[];
  orders: SellerOrderListItem[];
  brand: SellerBrand | null;
  finance: SellerFinanceSummary | null;
  creatingProduct: boolean;
  onCreateProduct: () => void;
};

export function SellerHomeTab({
  products,
  orders,
  brand,
  finance,
  creatingProduct,
  onCreateProduct,
}: Props) {
  const activeProducts = products.filter((product) => product.status === "ACTIVE").length;
  const attentionProducts = products.filter((product) =>
    ["DRAFT", "MODERATION", "NEEDS_REVISION", "BLOCKED"].includes(product.status ?? "DRAFT")
  ).length;
  const readyOrders = orders.filter(isReadyOrder).length;
  const activeOrders = orders.filter((order) =>
    !["COMPLETED", "CANCELED"].includes(order.status)
  ).length;
  const brandFields = brand
    ? [brand.name, brand.description, brand.logoUrl, brand.country, brand.foundationYear]
    : [];
  const brandCompleteness = brand
    ? Math.round((brandFields.filter(Boolean).length / brandFields.length) * 100)
    : 0;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Дашборд</h1>
          <p>{brand?.name || "Кабинет продавца"}</p>
        </div>

        <button
          type="button"
          className={styles.primaryAction}
          onClick={onCreateProduct}
          disabled={creatingProduct}
        >
          <Icon name="plus" size={16} />
          <span>Добавить товар</span>
        </button>
      </header>

      <div className={styles.widgetGrid}>
        <DashboardWidget
          href="/seller?tab=products"
          icon="package"
          title="Товары"
          value={`${activeProducts} активных`}
          meta={
            attentionProducts > 0
              ? `${attentionProducts} требуют внимания`
              : `${products.length} всего`
          }
        />

        <DashboardWidget
          href="/seller?tab=orders"
          icon="shopping-bag"
          title="Заказы"
          value={readyOrders > 0 ? `${readyOrders} к отправке` : `${activeOrders} в работе`}
          meta={`${orders.length} всего`}
        />

        <DashboardWidget
          href="/seller?tab=brand"
          icon="store"
          title="Бренд"
          value={brand?.name || "Заполните профиль"}
          meta={brand ? `Профиль заполнен на ${brandCompleteness}%` : "Добавьте данные бренда"}
        />

        <DashboardWidget
          href="/seller?tab=legal"
          icon="info"
          title="Информация"
          value="Реквизиты и доставка"
          meta="Данные для работы магазина"
        />
      </div>

      <Link href="/seller?tab=finance" className={styles.financeWidget}>
        <div className={styles.financeHead}>
          <span className={styles.financeIcon}>
            <Icon name="wallet" size={20} />
          </span>
          <span className={styles.financeTitle}>Финансы</span>
          <Icon name="arrow-up-right" size={18} className={styles.arrow} />
        </div>

        <div className={styles.financeBody}>
          <div>
            <span>Расчетный остаток</span>
            <strong>
              {finance ? formatMoney(finance.estimatedBalance) : "Нет данных"}
            </strong>
          </div>
          <div className={styles.financeMeta}>
            <span>Продажи {finance ? formatMoney(finance.salesAmount) : "—"}</span>
            <span>Комиссия {finance ? formatMoney(finance.commissionAmount) : "—"}</span>
          </div>
        </div>
      </Link>
    </section>
  );
}

function DashboardWidget({
  href,
  icon,
  title,
  value,
  meta,
}: {
  href: string;
  icon: IconName;
  title: string;
  value: string;
  meta: string;
}) {
  return (
    <Link href={href} className={styles.widget}>
      <div className={styles.widgetHead}>
        <Icon name={icon} size={20} />
        <Icon name="arrow-up-right" size={17} className={styles.arrow} />
      </div>
      <div className={styles.widgetText}>
        <span>{title}</span>
        <strong>{value}</strong>
        <p>{meta}</p>
      </div>
    </Link>
  );
}

function isReadyOrder(order: SellerOrderListItem) {
  return (
    order.paymentStatus === "PAID" &&
    (order.deliveryStatus === "PENDING" ||
      order.deliveryStatus === "READY_FOR_SHIPMENT" ||
      order.deliveryStatus === "READY_FOR_PICKUP")
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
