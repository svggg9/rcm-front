"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getSellerOnboardingStatus,
  type SellerOnboardingStatus as SellerOnboardingStatusType,
} from "../lib/sellerOnboardingApi";
import { SELLER_ONBOARDING_EVENT } from "../lib/sellerOnboardingEvents";

import styles from "./SellerOnboardingStatus.module.css";

const DISMISSED_STORAGE_KEY = "seller-onboarding-ready-dismissed";

type Step = {
  key: keyof Pick<
    SellerOnboardingStatusType,
    | "applicationCompleted"
    | "brandCompleted"
    | "legalCompleted"
    | "agreementAccepted"
  >;
  doneLabel: string;
  pendingLabel: string;
  href: string;
};

const STEPS: Step[] = [
  {
    key: "applicationCompleted",
    doneLabel: "Заявка продавца одобрена",
    pendingLabel: "Заявка продавца не одобрена",
    href: "/seller?tab=brand",
  },
  {
    key: "brandCompleted",
    doneLabel: "Профиль производителя заполнен",
    pendingLabel: "Профиль производителя не заполнен",
    href: "/seller?tab=brand",
  },
  {
    key: "legalCompleted",
    doneLabel: "Юридические данные заполнены",
    pendingLabel: "Юридические данные не заполнены",
    href: "/seller?tab=legal",
  },
  {
    key: "agreementAccepted",
    doneLabel: "Оферта продавца принята",
    pendingLabel: "Оферта продавца не принята",
    href: "/seller?tab=legal",
  },
];

export function SellerOnboardingStatus() {
  const [status, setStatus] = useState<SellerOnboardingStatusType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "true"
  );

  function dismissReadyStatus() {
    setDismissed(true);
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
  }

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
    return null;
  }

  if (status.progress === 100 && dismissed) {
    return null;
  }

  return (
    <section className={`${styles.card} ${status.progress === 100 ? styles.cardReady : ""}`}>
      {status.progress === 100 ? (
        <button
          type="button"
          className={styles.closeButton}
          onClick={dismissReadyStatus}
          aria-label="Скрыть онбординг"
        >
          ×
        </button>
      ) : null}

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

      {status.progress < 100 ? (
        <div className={styles.steps}>
        {STEPS.map((step) => {
          const done = Boolean(status[step.key]);
          const isLocked = step.key === "applicationCompleted";
          const label = done ? step.doneLabel : step.pendingLabel;
          const className = `${styles.step} ${done ? styles.stepDone : styles.stepPending} ${
            isLocked ? styles.stepStatic : ""
          }`;

          if (isLocked) {
            return (
              <div key={step.key} className={className}>
                <span>{label}</span>
              </div>
            );
          }

          return (
            <Link
              key={step.key}
              href={step.href}
              className={className}
            >
              <span>{label}</span>
              <span className={styles.stepArrow} aria-hidden="true">
                &gt;
              </span>
            </Link>
          );
        })}
        </div>
      ) : null}

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
