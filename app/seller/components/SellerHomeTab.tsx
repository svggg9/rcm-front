"use client";

import Link from "next/link";

import { Button } from "../../components/ui/Button";
import type { IconName } from "../../components/ui/Icon";
import { DesignSystemIcon as Icon } from "../../components/ui/DesignSystemIcon";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { SellerOnboardingStatus } from "../lib/sellerOnboardingApi";
import type { SellerBrand, SellerDashboardSummary } from "../types";

import styles from "./SellerHomeTab.module.css";
import { SellerOverview } from "./SellerOverview";

type Props = {
  brand: SellerBrand | null;
  summary: SellerDashboardSummary | null;
  onboardingStatus: SellerOnboardingStatus | null;
  onboardingLoading?: boolean;
  onboardingError?: boolean;
  onRetryOnboarding?: () => void;
  onNavigate: (href: string) => void;
  onCreateProduct: () => void;
};

type StoreTask = {
  title: string;
  description: string;
  href?: string;
  action?: string;
  icon: IconName;
  tone: "success" | "warning" | "danger" | "neutral";
  completed?: boolean;
};

export function SellerHomeTab({
  brand,
  summary,
  onboardingStatus,
  onboardingLoading = false,
  onboardingError = false,
  onRetryOnboarding,
  onNavigate,
  onCreateProduct,
}: Props) {
  const applicationReady = Boolean(
    onboardingStatus?.applicationCompleted || brand
  );
  const setupRequired =
    onboardingStatus === null ||
    Boolean(
      (!applicationReady ||
        !onboardingStatus.legalCompleted ||
        !onboardingStatus.agreementAccepted)
    );

  return (
    <section className={styles.page} aria-label="Обзор магазина">
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1>{brand?.name || "Магазин"}</h1>
            <StatusBadge size="regular" tone={!onboardingStatus ? "default" : setupRequired ? "warning" : "success"}>
              {!onboardingStatus ? (onboardingLoading ? "Проверка" : "Статус недоступен") : setupRequired ? "Подготовка" : "Активен"}
            </StatusBadge>
          </div>
        </div>

      </header>

      {onboardingStatus === null ? (
        onboardingLoading ? (
          <div className={styles.statusLoading} role="status" aria-busy="true" aria-label="Проверяем готовность магазина">
            <span className="buttonLoader" aria-hidden="true" />
          </div>
        ) : (
          <div className={styles.statusError} role="alert">
            <Icon name="alert" />
            <div className={styles.statusErrorCopy}>
              <strong>Не удалось проверить готовность магазина</strong>
              <span>
                {onboardingError
                  ? "Кабинет доступен, повторите проверку статуса"
                  : "Статус магазина пока недоступен"}
              </span>
            </div>
            {onRetryOnboarding ? (
              <Button type="button" variant="secondary" className={styles.action} onClick={onRetryOnboarding}>
                Повторить
              </Button>
            ) : null}
          </div>
        )
      ) : setupRequired ? (
        <SetupDashboard
          status={onboardingStatus}
          applicationReady={applicationReady}
        />
      ) : null}
      <SellerOverview brand={brand} summary={summary} onboarding={onboardingStatus} onNavigate={onNavigate} onCreateProduct={onCreateProduct} />
    </section>
  );
}

function SetupDashboard({
  status,
  applicationReady,
}: {
  status: SellerOnboardingStatus;
  applicationReady: boolean;
}) {
  const steps = [
    applicationReady,
    status.legalCompleted,
    status.agreementAccepted,
  ];
  const completedSteps = steps.filter(Boolean).length;
  const remainingSteps = steps.length - completedSteps;
  const tasks: StoreTask[] = [
    {
      title: "Заявка продавца",
      description: applicationReady
        ? "Магазин создан, доступ к кабинету открыт"
        : "Дождитесь решения по заявке продавца",
      icon: applicationReady ? "check-circle" : "clock",
      tone: applicationReady ? "success" : "warning",
      completed: applicationReady,
    },
    {
      title: "Заполнить данные магазина",
      description: "Реквизиты, банк и пункт отправления",
      href: status.legalCompleted ? undefined : "/seller?tab=legal",
      action: status.legalCompleted ? undefined : "Заполнить",
      icon: status.legalCompleted ? "check-circle" : "file",
      tone: status.legalCompleted ? "success" : "neutral",
      completed: status.legalCompleted,
    },
    {
      title: "Принять условия работы",
      description: "Ознакомьтесь и примите оферту продавца",
      href: status.agreementAccepted ? undefined : "/seller?tab=legal",
      action: status.agreementAccepted ? undefined : "Перейти к оферте",
      icon: status.agreementAccepted ? "check-circle" : "info",
      tone: status.agreementAccepted ? "success" : "neutral",
      completed: status.agreementAccepted,
    },
  ];

  return (
    <section className={styles.panel} aria-label="Подготовка магазина">
          <div className={styles.setupHeading}>
            <h2>Подготовка магазина</h2>
            <span>{completedSteps} из {steps.length} выполнено</span>
          </div>
          <p className={styles.setupCopy}>Осталось {remainingSteps} {pluralizeStep(remainingSteps)} до начала продаж. Ассортимент можно готовить уже сейчас</p>
          <div className={styles.taskList}>
            {tasks.map((task) => (
              <TaskRow key={task.title} task={task} />
            ))}
          </div>
    </section>
  );
}

function TaskRow({ task }: { task: StoreTask }) {
  return (
    <article className={`${styles.task} ${styles[task.tone]}`}>
      <span className={`${styles.taskIcon} ${["check-circle", "clock", "alert"].includes(task.icon) ? styles.statusIcon : ""}`}>
        <Icon name={task.icon} />
      </span>
      <div className={styles.taskCopy}>
        <strong>{task.title}</strong>
        <p>{task.description}</p>
      </div>
      {task.href && task.action ? (
        <Link
          href={task.href}
          className={`buttonSecondary ${styles.action} ${styles.taskAction}`}
          prefetch={false}
        >
          {task.action}
        </Link>
      ) : task.completed ? (
        <span className={styles.taskComplete}>
          <Icon name="check" role="utility" />
          Готово
        </span>
      ) : null}
    </article>
  );
}

function pluralizeStep(value: number) {
  return pluralize(value, "шаг", "шага", "шагов");
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
