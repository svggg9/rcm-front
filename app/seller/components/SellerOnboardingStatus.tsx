"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon, type IconName } from "../../components/ui/Icon";
import {
  getSellerOnboardingStatus,
  type SellerOnboardingStatus as SellerOnboardingStatusType,
} from "../lib/sellerOnboardingApi";
import { SELLER_ONBOARDING_EVENT } from "../lib/sellerOnboardingEvents";

import styles from "./SellerOnboardingStatus.module.css";

type StepKey = keyof Pick<
  SellerOnboardingStatusType,
  | "applicationCompleted"
  | "brandCompleted"
  | "legalCompleted"
  | "agreementAccepted"
>;

type Step = {
  key: StepKey;
  title: string;
  description: string;
  href?: string;
  icon: IconName;
};

type Props = {
  initialStatus: SellerOnboardingStatusType | null;
};

const STEPS: Step[] = [
  {
    key: "applicationCompleted",
    title: "Одобрение продавца",
    description: "Заявка рассматривается",
    icon: "clock",
  },
  {
    key: "brandCompleted",
    title: "Оформить профиль бренда",
    description: "Название, описание и логотип",
    href: "/seller?tab=brand",
    icon: "store",
  },
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

export function SellerOnboardingStatus({ initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    async function refreshStatus() {
      try {
        setStatus(await getSellerOnboardingStatus());
      } catch {
        // Readiness is supplementary and must not block the seller cabinet.
      }
    }

    const handleChange = () => {
      void refreshStatus();
    };

    if (!initialStatus) {
      void refreshStatus();
    }

    window.addEventListener(SELLER_ONBOARDING_EVENT, handleChange);

    return () => {
      window.removeEventListener(SELLER_ONBOARDING_EVENT, handleChange);
    };
  }, [initialStatus]);

  if (!status || status.progress >= 100) {
    return null;
  }

  const pendingSteps = STEPS.filter((step) => !status[step.key]);

  return (
    <section className={styles.section} aria-labelledby="seller-readiness-title">
      <div className={styles.head}>
        <div>
          <h2 id="seller-readiness-title">Подготовка магазина</h2>
          <p>{formatRemainingSteps(pendingSteps.length)}</p>
        </div>
        <span className={styles.counter}>
          {status.completedSteps}/{status.totalSteps}
        </span>
      </div>

      <div className={styles.progress} aria-label={`Готово на ${status.progress}%`}>
        {Array.from({ length: status.totalSteps }, (_, index) => (
          <span
            key={index}
            className={index < status.completedSteps ? styles.progressDone : undefined}
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
    <Link href={step.href} className={styles.task}>
      {content}
    </Link>
  );
}

function formatRemainingSteps(count: number) {
  if (count === 1) return "Остался 1 шаг до готовности";
  if (count >= 2 && count <= 4) return `Осталось ${count} шага до готовности`;
  return `Осталось ${count} шагов до готовности`;
}
