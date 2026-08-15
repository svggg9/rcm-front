"use client";

import Link from "next/link";

import { Button } from "../../components/ui/Button";
import { Icon, type IconName } from "../../components/ui/Icon";
import type { SellerOnboardingStatus } from "../lib/sellerOnboardingApi";
import type { SellerBrand, SellerDashboardSummary } from "../types";

import styles from "./SellerHomeTab.module.css";

type Props = {
  brand: SellerBrand | null;
  summary: SellerDashboardSummary | null;
  onboardingStatus: SellerOnboardingStatus | null;
  creatingProduct: boolean;
  onCreateProduct: () => void;
};

type StoreTask = {
  title: string;
  description: string;
  href?: string;
  action?: string;
  icon: IconName;
  tone: "success" | "warning" | "danger" | "neutral";
};

export function SellerHomeTab({
  brand,
  summary,
  onboardingStatus,
  creatingProduct,
  onCreateProduct,
}: Props) {
  const setupRequired = Boolean(
    onboardingStatus &&
      (!onboardingStatus.legalCompleted ||
        !onboardingStatus.agreementAccepted)
  );

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1>{brand?.name || "Магазин"}</h1>
            <span
              className={`${styles.headerStatus} ${
                setupRequired ? styles.headerStatusPending : styles.headerStatusReady
              }`}
            >
              <Icon
                name={setupRequired ? "clock" : "check-circle"}
                size={15}
              />
              {setupRequired ? "Подготовка" : "Работает"}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className={styles.addButton}
        loading={creatingProduct}
        onClick={onCreateProduct}
      >
          Добавить товар
        </Button>
      </header>

      {setupRequired && onboardingStatus ? (
        <SetupDashboard
          status={onboardingStatus}
          creatingProduct={creatingProduct}
          onCreateProduct={onCreateProduct}
        />
      ) : (
        <WorkingDashboard brand={brand} summary={summary} />
      )}
    </section>
  );
}

function SetupDashboard({
  status,
  creatingProduct,
  onCreateProduct,
}: {
  status: SellerOnboardingStatus;
  creatingProduct: boolean;
  onCreateProduct: () => void;
}) {
  const applicationReady = status.applicationCompleted && status.brandCompleted;
  const steps = [
    applicationReady,
    status.legalCompleted,
    status.agreementAccepted,
  ];
  const completedSteps = steps.filter(Boolean).length;
  const remainingSteps = steps.length - completedSteps;
  const tasks: StoreTask[] = [
    {
      title: "Заявка продавца одобрена",
      description: applicationReady
        ? "Магазин создан, доступ к кабинету открыт."
        : "Завершите заявку и добавьте основные данные бренда.",
      icon: applicationReady ? "check-circle" : "clock",
      tone: applicationReady ? "success" : "warning",
    },
    {
      title: "Заполнить данные магазина",
      description: "Реквизиты, банк и пункт отправления.",
      href: status.legalCompleted ? undefined : "/seller?tab=legal",
      action: status.legalCompleted ? undefined : "Заполнить",
      icon: status.legalCompleted ? "check-circle" : "file",
      tone: status.legalCompleted ? "success" : "neutral",
    },
    {
      title: "Принять условия работы",
      description: "Ознакомьтесь и примите оферту продавца.",
      href: status.agreementAccepted ? undefined : "/seller?tab=legal",
      action: status.agreementAccepted ? undefined : "Перейти к оферте",
      icon: status.agreementAccepted ? "check-circle" : "info",
      tone: status.agreementAccepted ? "success" : "neutral",
    },
  ];

  return (
    <div className={styles.dashboard}>
      <section className={styles.setupIntro}>
        <span className={`${styles.iconCircle} ${styles.warningIcon}`}>
          <Icon name="clock" size={20} />
        </span>
        <div>
          <span className={styles.statusLabel}>Подготовка магазина</span>
          <h2>Завершите настройку, чтобы начать продажи</h2>
          <p>
            Осталось {remainingSteps} {pluralizeStep(remainingSteps)}. Ассортимент
            можно готовить параллельно.
          </p>
        </div>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.panel}>
          <PanelHeading
            eyebrow="Задачи для запуска"
            title={`${completedSteps} из ${steps.length} выполнено`}
            icon="check-circle"
          />
          <div className={styles.taskList}>
            {tasks.map((task) => (
              <TaskRow key={task.title} task={task} />
            ))}
          </div>
        </section>
      </div>

      <section className={styles.assortmentCard}>
        <span className={`${styles.iconCircle} ${styles.goldIcon}`}>
          <Icon name="package" size={20} />
        </span>
        <div className={styles.assortmentCopy}>
          <span className={styles.eyebrow}>Делайте параллельно</span>
          <h2>Подготовьте ассортимент</h2>
          <p>
            Создавайте карточки товаров уже сейчас — опубликовать их можно после
            завершения настройки магазина.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          className={styles.addButton}
          loading={creatingProduct}
          onClick={onCreateProduct}
        >
          Добавить товар
        </Button>
      </section>
    </div>
  );
}

function WorkingDashboard({
  brand,
  summary,
}: {
  brand: SellerBrand | null;
  summary: SellerDashboardSummary | null;
}) {
  const activeProducts = summary?.activeProducts ?? 0;
  const attentionProducts = summary?.attentionProducts ?? 0;
  const readyOrders = summary?.readyOrders ?? 0;
  const tasks: StoreTask[] = [];

  if (readyOrders > 0) {
    tasks.push({
      title: `${readyOrders} ${pluralizeOrder(readyOrders)} к отправке`,
      description: "Подготовьте товары и передайте отправления в службу доставки.",
      href: "/seller?tab=orders",
      action: "Открыть заказы",
      icon: "delivery-truck",
      tone: "warning",
    });
  }

  if (attentionProducts > 0) {
    tasks.push({
      title: `${attentionProducts} ${pluralizeProduct(
        attentionProducts
      )} требуют внимания`,
      description: "Проверьте остатки, статус публикации и данные карточек.",
      href: "/seller?tab=products",
      action: "Открыть товары",
      icon: "alert",
      tone: "danger",
    });
  }

  if (brand && (!brand.description || !brand.wordmarkUrl)) {
    tasks.push({
      title: "Дополните витрину магазина",
      description: "Добавьте описание и wordmark, чтобы оформить страницу бренда.",
      href: "/seller?tab=brand",
      action: "Открыть витрину",
      icon: "store",
      tone: "neutral",
    });
  }

  return (
    <div className={styles.dashboard}>
      <section className={styles.metrics} aria-label="Сводка магазина">
        <Metric
          icon="package"
          tone="success"
          label="Активные товары"
          value={String(activeProducts)}
          href="/seller?tab=products"
        />
        <Metric
          icon="delivery-truck"
          tone={readyOrders > 0 ? "warning" : "success"}
          label="К отправке"
          value={String(readyOrders)}
          href="/seller?tab=orders"
        />
        <Metric
          icon="money"
          tone="gold"
          label="Продажи"
          value={summary ? formatMoney(summary.salesAmount) : "—"}
          href="/seller?tab=finance"
        />
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.panel}>
          <PanelHeading
            eyebrow="Задачи"
            title={tasks.length > 0 ? "Требуют внимания" : "Новых задач нет"}
            icon={tasks.length > 0 ? "bell" : "check-circle"}
          />
          {tasks.length > 0 ? (
            <div className={styles.taskList}>
              {tasks.map((task) => (
                <TaskRow key={task.title} task={task} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyTasks}>
              <span className={`${styles.iconCircle} ${styles.successIcon}`}>
                <Icon name="check" size={20} />
              </span>
              <div>
                <strong>Всё под контролем</strong>
                <p>Новых задач по магазину пока нет.</p>
              </div>
            </div>
          )}
        </section>

      </div>

      <Link
        href="/seller?tab=finance"
        className={styles.financeCard}
        prefetch={false}
      >
        <div className={styles.financeHeading}>
          <span className={`${styles.iconCircle} ${styles.goldIcon}`}>
            <Icon name="wallet" size={20} />
          </span>
          <div>
            <span>Финансы</span>
            <strong>
              {summary ? formatMoney(summary.estimatedBalance) : "Нет данных"}
            </strong>
          </div>
        </div>
        <div className={styles.financeMeta}>
          <span>
            Продажи {summary ? formatMoney(summary.salesAmount) : "—"}
          </span>
          <span>
            Комиссия {summary ? formatMoney(summary.commissionAmount) : "—"}
          </span>
        </div>
        <Icon name="arrow-up-right" size={19} />
      </Link>
    </div>
  );
}

function PanelHeading({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: IconName;
}) {
  return (
    <div className={styles.panelHeading}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <Icon name={icon} size={19} />
    </div>
  );
}

function TaskRow({ task }: { task: StoreTask }) {
  return (
    <article className={`${styles.task} ${styles[task.tone]}`}>
      <span className={styles.taskIcon}>
        <Icon name={task.icon} size={18} />
      </span>
      <div className={styles.taskCopy}>
        <strong>{task.title}</strong>
        <p>{task.description}</p>
      </div>
      {task.href && task.action ? (
        <Link
          href={task.href}
          className={`buttonSecondary ${styles.taskAction}`}
          prefetch={false}
        >
          {task.action}
        </Link>
      ) : (
        <span className={styles.taskComplete}>
          <Icon name="check" size={15} />
          Готово
        </span>
      )}
    </article>
  );
}

function Metric({
  icon,
  tone,
  label,
  value,
  href,
}: {
  icon: IconName;
  tone: "success" | "warning" | "gold";
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link href={href} className={styles.metric} prefetch={false}>
      <span className={`${styles.metricIcon} ${styles[`${tone}Metric`]}`}>
        <Icon name={icon} size={18} />
      </span>
      <span className={styles.metricLabel}>{label}</span>
      <strong>{value}</strong>
      <Icon name="arrow-up-right" size={16} className={styles.metricArrow} />
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

function pluralizeStep(value: number) {
  return pluralize(value, "шаг", "шага", "шагов");
}

function pluralizeOrder(value: number) {
  return pluralize(value, "заказ", "заказа", "заказов");
}

function pluralizeProduct(value: number) {
  return pluralize(value, "товар", "товара", "товаров");
}

function pluralize(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
}
