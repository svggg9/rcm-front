"use client";

import Link from "next/link";

import { Icon, type IconName } from "../../components/ui/Icon";
import type { SellerOnboardingStatus as SellerOnboardingStatusType } from "../lib/sellerOnboardingApi";

import styles from "./SellerOnboardingStatus.module.css";

type StepKey = keyof Pick<
  SellerOnboardingStatusType,
  "legalCompleted" | "agreementAccepted"
>;

type Step = {
  key: StepKey;
  title: string;
  description: string;
  href?: string;
  icon: IconName;
};

type Props = {
  status: SellerOnboardingStatusType | null;
};

const STEPS: Step[] = [
  {
    key: "legalCompleted",
    title: "Заполнить данные магазина",
    description: "Реквизиты, банк и пункт отправления",
    href: "/seller?tab=legal",
    icon: "file",
  },
  {
    key: "agreementAccepted",
    title: "Принять условия работы",
    description: "Оферта продавца",
    href: "/seller?tab=legal",
    icon: "check",
  },
];

export function SellerOnboardingStatus({ status }: Props) {
  if (!status) {
    return null;
  }

  const pendingSteps = STEPS.filter((step) => !status[step.key]);
  const completedSteps = STEPS.length - pendingSteps.length;
  const progress = Math.round((completedSteps / STEPS.length) * 100);

  if (pendingSteps.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="seller-readiness-title">
      <div className={styles.head}>
        <div>
          <h2 id="seller-readiness-title">Подготовка магазина</h2>
          <p>{formatRemainingSteps(pendingSteps.length)}</p>
        </div>
        <span className={styles.counter}>
          {completedSteps}/{STEPS.length}
        </span>
      </div>

      <div className={styles.progress} aria-label={`Готово на ${progress}%`}>
        {Array.from({ length: STEPS.length }, (_, index) => (
          <span
            key={index}
            className={index < completedSteps ? styles.progressDone : undefined}
          />
        ))}
      </div>

      <div className={styles.tasks}>
        {pendingSteps.map((step) => (
          <PendingStep key={step.key} step={step} />
        ))}
      </div>
    </section>
  );
}

function PendingStep({ step }: { step: Step }) {
  const content = (
    <>
      <Icon name={step.icon} size={18} className={styles.taskIcon} />
      <span className={styles.taskText}>
        <strong>{step.title}</strong>
        <span>{step.description}</span>
      </span>
      {step.href ? (
        <Icon name="chevron-right" size={17} className={styles.taskArrow} />
      ) : null}
    </>
  );

  if (!step.href) {
    return <div className={`${styles.task} ${styles.taskStatic}`}>{content}</div>;
  }

  return (
    <Link href={step.href} className={styles.task} prefetch={false}>
      {content}
    </Link>
  );
}

function formatRemainingSteps(count: number) {
  if (count === 1) return "Остался 1 шаг до готовности";
  if (count >= 2 && count <= 4) return `Осталось ${count} шага до готовности`;
  return `Осталось ${count} шагов до готовности`;
}
