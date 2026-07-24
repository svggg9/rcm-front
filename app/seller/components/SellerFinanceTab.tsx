"use client";

import { useState } from "react";
import Link from "next/link";

import { Icon } from "../../components/ui/Icon";
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

export function SellerFinanceTab({ finance, onPrefetchOrder }: Props) {
  const [view, setView] = useState<FinanceView>("overview");

  if (!finance) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <h1>Финансы</h1>
        </header>
        <div className={styles.empty}>Финансовая сводка временно недоступна</div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Финансы</h1>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Разделы финансов">
        <Tab active={view === "overview"} onClick={() => setView("overview")}>
          Обзор
        </Tab>
        <Tab active={view === "operations"} onClick={() => setView("operations")}>
          Операции
        </Tab>
        <Tab active={view === "payouts"} onClick={() => setView("payouts")}>
          Выплаты
        </Tab>
      </nav>

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
        <Link href="/seller?tab=legal" className={styles.notice}>
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
                  <dd>{payout.items.filter((item) => item.type === "ORDER").length}</dd>
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

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${styles.tab} ${active ? styles.tabActive : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  hint,
}: {
  icon: "wallet" | "clock" | "money" | "check";
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className={styles.summaryItem}>
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
      onMouseEnter={() => onPrefetchOrder?.(operation.orderId!)}
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
  return <span className={`${styles.status} ${styles[`status${status}`]}`}>{labels[status]}</span>;
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
