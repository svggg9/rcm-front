"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { CabinetTabs, type CabinetTabItem } from "../../components/ui/CabinetTabs";
import { Icon } from "../../components/ui/Icon";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "../../components/ui/StatusBadge";
import type {
  SellerFinanceOperation,
  SellerFinanceSummary,
  SellerPayout,
  SellerPayoutStatus,
} from "../types";

import styles from "./SellerFinanceTab.module.css";

type Props = {
  finance: SellerFinanceSummary | null;
  onPrefetchOrder?: (orderId: number) => void;
};

type FinanceView = "overview" | "operations" | "payouts";

const financeTabs: CabinetTabItem<FinanceView>[] = [
  { value: "overview", label: "Обзор" },
  { value: "operations", label: "Операции" },
  { value: "payouts", label: "Выплаты" },
];

export function SellerFinanceTab({ finance, onPrefetchOrder }: Props) {
  const [view, setView] = useState<FinanceView>("overview");

  if (!finance) {
    return (
      <section className={styles.page}>
        <div className={styles.empty}>Финансовая сводка временно недоступна</div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.tabs}>
        <CabinetTabs
          items={financeTabs}
          value={view}
          onChange={setView}
          ariaLabel="Разделы финансов"
          appearance="segmented"
        />
      </div>

      {view === "overview" ? (
        <Overview finance={finance} onPrefetchOrder={onPrefetchOrder} />
      ) : null}
      {view === "operations" ? (
        <Operations
          operations={finance.operations}
          onPrefetchOrder={onPrefetchOrder}
        />
      ) : null}
      {view === "payouts" ? <Payouts payouts={finance.payouts} /> : null}
    </section>
  );
}

function Overview({
  finance,
  onPrefetchOrder,
}: {
  finance: SellerFinanceSummary;
  onPrefetchOrder?: (orderId: number) => void;
}) {
  return (
    <>
      <div className={styles.summaryGrid}>
        <SummaryItem
          icon="wallet"
          label="К выплате"
          value={finance.availableAmount}
          hint="Доступно для следующего реестра"
          emphasis
        />
        <SummaryItem
          icon="clock"
          label="В обработке"
          value={finance.processingAmount}
          hint="Доставка, холд или открытый возврат"
        />
        <SummaryItem
          icon="money"
          label={`Ближайшая выплата · ${formatShortDate(finance.nextPayoutDate)}`}
          value={finance.nextPayoutAmount}
          hint="Реестры формируются 10-го и 25-го"
        />
        <SummaryItem
          icon="check"
          label="Выплачено за месяц"
          value={finance.paidThisMonthAmount}
          hint="Подтвержденные банковские выплаты"
        />
      </div>

      {!finance.bankDetailsReady ? (
        <Link href="/seller?tab=legal" className={styles.notice} prefetch={false}>
          <Icon name="alert" size={18} />
          <span>
            <strong>Заполните банковские реквизиты</strong>
            Без них РЦМ не сможет сформировать реестр выплаты.
          </span>
          <Icon name="chevron-right" size={18} />
        </Link>
      ) : null}

      <section className={styles.calculation}>
        <div className={styles.calculationHead}>
          <div>
            <span>Расчетный баланс</span>
            <strong>{formatMoney(finance.estimatedBalance)}</strong>
          </div>
          <p>
            Продажи за вычетом комиссии, возвратов и уже проведённых выплат.
          </p>
        </div>
        <div className={styles.formula}>
          <FormulaItem label="Продажи" value={finance.salesAmount} />
          <span className={styles.formulaSign}>−</span>
          <FormulaItem label="Комиссия РЦМ" value={finance.commissionAmount} />
          <span className={styles.formulaSign}>−</span>
          <FormulaItem label="Возвраты и удержания" value={finance.adjustmentsAmount} />
          <span className={styles.formulaSign}>−</span>
          <FormulaItem label="Выплачено" value={finance.paidOutAmount} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Последние операции</h2>
        </div>
        <OperationList
          operations={finance.operations.slice(0, 8)}
          onPrefetchOrder={onPrefetchOrder}
        />
      </section>
    </>
  );
}

function Operations({
  operations,
  onPrefetchOrder,
}: {
  operations: SellerFinanceOperation[];
  onPrefetchOrder?: (orderId: number) => void;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2>Операции</h2>
        </div>
      </div>
      <OperationList operations={operations} onPrefetchOrder={onPrefetchOrder} />
    </section>
  );
}

function Payouts({ payouts }: { payouts: SellerPayout[] }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2>Выплаты</h2>
        </div>
      </div>

      {payouts.length ? (
        <div className={styles.payoutList}>
          {payouts.map((payout) => (
            <article className={styles.payout} key={payout.id}>
              <div className={styles.payoutTop}>
                <div>
                  <span>Выплата #{payout.id}</span>
                  <strong>{formatMoney(payout.payoutAmount)}</strong>
                </div>
                <PayoutStatus status={payout.status} />
              </div>
              <dl className={styles.payoutDetails}>
                <div>
                  <dt>Плановая дата</dt>
                  <dd>{formatDate(payout.scheduledDate)}</dd>
                </div>
                <div>
                  <dt>Счет</dt>
                  <dd>{payout.checkingAccount}</dd>
                </div>
                <div>
                  <dt>Заказов</dt>
                  <dd>{payout.orderCount}</dd>
                </div>
                <div>
                  <dt>Платежное поручение</dt>
                  <dd>{payout.paymentOrderNumber || "—"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Выплат пока не было</div>
      )}
    </section>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  hint,
  emphasis = false,
}: {
  icon: "wallet" | "clock" | "money" | "check";
  label: string;
  value: number;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`${styles.summaryItem} ${
        emphasis ? styles.summaryItemPrimary : ""
      }`.trim()}
    >
      <Icon name={icon} size={19} />
      <span>{label}</span>
      <strong>{formatMoney(value)}</strong>
      <small>{hint}</small>
    </div>
  );
}

function FormulaItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{formatMoney(value)}</strong>
    </div>
  );
}

function OperationList({
  operations,
  onPrefetchOrder,
}: {
  operations: SellerFinanceOperation[];
  onPrefetchOrder?: (orderId: number) => void;
}) {
  if (!operations.length) {
    return <div className={styles.empty}>Операций пока нет</div>;
  }

  return (
    <div className={styles.operationList}>
      {operations.map((operation, index) => (
        <OperationRow
          key={`${operation.type}-${operation.orderId ?? "none"}-${operation.createdAt}-${index}`}
          operation={operation}
          onPrefetchOrder={onPrefetchOrder}
        />
      ))}
    </div>
  );
}

function OperationRow({
  operation,
  onPrefetchOrder,
}: {
  operation: SellerFinanceOperation;
  onPrefetchOrder?: (orderId: number) => void;
}) {
  const isCredit = operation.direction === "CREDIT";
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    },
    []
  );

  function schedulePrefetch() {
    if (!operation.orderId || !onPrefetchOrder || prefetchTimerRef.current) return;
    prefetchTimerRef.current = setTimeout(() => {
      prefetchTimerRef.current = null;
      onPrefetchOrder(operation.orderId!);
    }, 180);
  }

  function cancelPrefetch() {
    if (!prefetchTimerRef.current) return;
    clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
  }
  const content = (
    <>
      <Icon name={getOperationIcon(operation.type)} size={18} className={styles.operationIcon} />
      <div className={styles.operationMain}>
        <strong>{getOperationLabel(operation)}</strong>
        <span>{formatDateTime(operation.createdAt)}</span>
      </div>
      <span className={`${styles.operationAmount} ${isCredit ? "" : styles.operationDebit}`}>
        {isCredit ? "+" : "−"}{formatMoney(operation.amount)}
      </span>
      {operation.orderId ? <Icon name="chevron-right" size={17} /> : null}
    </>
  );

  return operation.orderId ? (
    <Link
      href={`/seller?tab=orders&orderId=${operation.orderId}`}
      className={styles.operationRow}
      prefetch={false}
      onMouseEnter={schedulePrefetch}
      onMouseLeave={cancelPrefetch}
      onFocus={() => onPrefetchOrder?.(operation.orderId!)}
    >
      {content}
    </Link>
  ) : (
    <div className={styles.operationRow}>{content}</div>
  );
}

function PayoutStatus({ status }: { status: SellerPayoutStatus }) {
  const labels: Record<SellerPayoutStatus, string> = {
    READY: "Готова к отправке",
    SENT: "Отправлена",
    PAID: "Выплачена",
    FAILED: "Ошибка",
    CANCELLED: "Отменена",
  };
  const tones: Record<SellerPayoutStatus, StatusBadgeTone> = {
    READY: "default",
    SENT: "warning",
    PAID: "success",
    FAILED: "danger",
    CANCELLED: "danger",
  };

  return (
    <StatusBadge tone={tones[status]} size="regular">
      {labels[status]}
    </StatusBadge>
  );
}

function getOperationLabel(operation: SellerFinanceOperation) {
  if (operation.type === "SALE") return operation.orderId ? `Продажа по заказу ${operation.orderId}` : "Продажа";
  if (operation.type === "SELLER_DEBIT") return "Возврат или удержание";
  if (operation.type === "SELLER_PAYOUT") return "Выплата";
  return "Финансовая операция";
}

function getOperationIcon(type: SellerFinanceOperation["type"]) {
  if (type === "SALE") return "shopping-bag" as const;
  if (type === "SELLER_PAYOUT") return "wallet" as const;
  return "alert" as const;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
