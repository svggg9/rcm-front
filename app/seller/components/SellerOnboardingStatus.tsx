"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getSellerOnboardingStatus,
  type SellerOnboardingStatus as SellerOnboardingStatusType,
} from "../lib/sellerOnboardingApi";
import { SELLER_ONBOARDING_EVENT } from "../lib/sellerOnboardingEvents";

import styles from "./SellerOnboardingStatus.module.css";

type Step = {
  key: keyof Pick<
    SellerOnboardingStatusType,
    | "applicationCompleted"
    | "brandCompleted"
    | "legalCompleted"
    | "agreementAccepted"
  >;
  label: string;
  href: string;
};

const STEPS: Step[] = [
  {
    key: "applicationCompleted",
    label: "Заявка продавца одобрена",
    href: "/seller?tab=brand",
  },
  {
    key: "brandCompleted",
    label: "Профиль производителя заполнен",
    href: "/seller?tab=brand",
  },
  {
    key: "legalCompleted",
    label: "Юридические данные заполнены",
    href: "/seller?tab=legal",
  },
  {
    key: "agreementAccepted",
    label: "Оферта продавца принята",
    href: "/seller?tab=legal",
  },
];

export function SellerOnboardingStatus() {
  const [status, setStatus] = useState<SellerOnboardingStatusType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    setError(null);

    try {
      const data = await getSellerOnboardingStatus();
      setStatus(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось загрузить готовность магазина"
      );
    }
  }

    useEffect(() => {
    const handleChange = () => {
        void loadStatus();
    };

    window.setTimeout(handleChange, 0);

    window.addEventListener(SELLER_ONBOARDING_EVENT, handleChange);

    return () => {
        window.removeEventListener(SELLER_ONBOARDING_EVENT, handleChange);
    };
    }, []);

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!status) {
    return <div className={styles.state}>Загрузка готовности магазина…</div>;
  }

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div>
          <div className={styles.kicker}>Онбординг</div>
          <h2 className={styles.title}>Готовность магазина</h2>
        </div>

        <div className={styles.progressValue}>{status.progress}%</div>
      </div>

      <div className={styles.progressTrack}>
        <div
          className={styles.progressBar}
          style={{ width: `${status.progress}%` }}
        />
      </div>

      <div className={styles.steps}>
        {STEPS.map((step) => {
          const done = Boolean(status[step.key]);

          return (
            <Link key={step.key} href={step.href} className={styles.step}>
              <span className={done ? styles.stepDone : styles.stepPending}>
                {done ? "✓" : "—"}
              </span>
              <span>{step.label}</span>
            </Link>
          );
        })}
      </div>

      {status.progress < 100 ? (
        <p className={styles.hint}>
          Заполните недостающие пункты, чтобы магазин был готов к продажам.
        </p>
      ) : (
        <p className={styles.hint}>
          Магазин готов. Можно публиковать товары и принимать заказы.
        </p>
      )}
    </section>
  );
}