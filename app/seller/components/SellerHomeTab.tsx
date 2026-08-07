"use client";

import Link from "next/link";

import { Icon, type IconName } from "../../components/ui/Icon";
import type {
  SellerBrand,
  SellerDashboardSummary,
} from "../types";

import styles from "./SellerHomeTab.module.css";

type Props = {
  brand: SellerBrand | null;
  summary: SellerDashboardSummary | null;
};

export function SellerHomeTab({
  brand,
  summary,
}: Props) {
  const activeProducts = summary?.activeProducts ?? 0;
  const attentionProducts = summary?.attentionProducts ?? 0;
  const readyOrders = summary?.readyOrders ?? 0;
  const activeOrders = summary?.activeOrders ?? 0;
  const brandFields = brand
    ? [brand.name, brand.description, brand.wordmarkUrl]
    : [];
  const brandCompleteness = brand
    ? Math.round((brandFields.filter(Boolean).length / brandFields.length) * 100)
    : 0;
  const storeName = brand?.name?.trim() || "вашего магазина";
  const needsAttention = readyOrders + attentionProducts;

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Обзор магазина</span>
          <h1>Добро пожаловать в кабинет {storeName}</h1>
          <p>
            Следите за заказами, обновляйте ассортимент и управляйте брендом
            в одном месте.
          </p>
        </div>

        <Link href="/seller?tab=products" className={styles.heroAction} prefetch={false}>
          <Icon name="plus" size={17} />
          <span>Добавить товар</span>
        </Link>
      </header>

      <div className={styles.statusStrip}>
        <div className={styles.statusLead}>
          <span className={styles.statusIcon}>
            <Icon name={needsAttention > 0 ? "bell" : "check"} size={18} />
          </span>
          <div>
            <strong>
              {needsAttention > 0
                ? `${needsAttention} ${pluralizeTask(needsAttention)} требуют внимания`
                : "Всё под контролем"}
            </strong>
            <p>
              {needsAttention > 0
                ? "Проверьте заказы к отправке и карточки товаров."
                : "Новых задач по магазину пока нет."}
            </p>
          </div>
        </div>
        <Link
          href={readyOrders > 0 ? "/seller?tab=orders" : "/seller?tab=products"}
          prefetch={false}
        >
          Перейти к задачам
          <Icon name="chevron-right" size={16} />
        </Link>
      </div>

      <div className={styles.widgetGrid}>
        <DashboardWidget
          href="/seller?tab=products"
          icon="package"
          title="Товары"
          value={`${activeProducts} активных`}
          meta={
            attentionProducts > 0
              ? `${attentionProducts} требуют внимания`
              : `${summary?.totalProducts ?? 0} всего`
          }
          tone="blue"
        />

        <DashboardWidget
          href="/seller?tab=orders"
          icon="shopping-bag"
          title="Заказы"
          value={readyOrders > 0 ? `${readyOrders} к отправке` : `${activeOrders} в работе`}
          meta={`${summary?.totalOrders ?? 0} всего`}
          tone="coral"
        />

        <DashboardWidget
          href="/seller?tab=brand"
          icon="store"
          title="Витрина"
          value={brand?.name || "Заполните профиль"}
          meta={brand ? `Профиль заполнен на ${brandCompleteness}%` : "Добавьте данные бренда"}
          tone="lilac"
        />

        <DashboardWidget
          href="/seller?tab=legal"
          icon="info"
          title="Информация"
          value="Реквизиты и доставка"
          meta="Данные для работы магазина"
          tone="sand"
        />
      </div>

      <Link
        href="/seller?tab=finance"
        className={styles.financeWidget}
        prefetch={false}
      >
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
              {summary ? formatMoney(summary.estimatedBalance) : "Нет данных"}
            </strong>
          </div>
          <div className={styles.financeMeta}>
            <span>
              Продажи {summary ? formatMoney(summary.salesAmount) : "—"}
            </span>
            <span>
              Комиссия{" "}
              {summary ? formatMoney(summary.commissionAmount) : "—"}
            </span>
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
  tone,
}: {
  href: string;
  icon: IconName;
  title: string;
  value: string;
  meta: string;
  tone: "blue" | "coral" | "lilac" | "sand";
}) {
  return (
    <Link href={href} className={`${styles.widget} ${styles[tone]}`} prefetch={false}>
      <div className={styles.widgetHead}>
        <div className={styles.widgetHeading}>
          <span className={styles.widgetIcon}>
            <Icon name={icon} size={20} />
          </span>
          <span className={styles.widgetTitle}>{title}</span>
        </div>
        <Icon name="arrow-up-right" size={17} className={styles.arrow} />
      </div>
      <div className={styles.widgetText}>
        <strong>{value}</strong>
        <p>{meta}</p>
      </div>
    </Link>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function pluralizeTask(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return "задача";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "задачи";
  }
  return "задач";
}
