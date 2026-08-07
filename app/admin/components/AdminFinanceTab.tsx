"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { CabinetTabs } from "../../components/ui/CabinetTabs";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import { StatusBadge, type StatusBadgeTone } from "../../components/ui/StatusBadge";
import {
  generateAdminSellerPayouts,
  updateAdminSellerPayout,
} from "../lib/adminApi";
import type {
  AdminFinancialLedgerEntry,
  AdminSellerPayout,
  AdminSellerPayoutStats,
  AdminSellerPayoutStatus,
  FinancialLedgerEntryType,
} from "../types";

import adminStyles from "../Admin.module.css";
import styles from "./AdminFinanceTab.module.css";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";

type Props = {
  entries: AdminFinancialLedgerEntry[];
  totalElements: number;
  refreshing: boolean;
  ledgerLoaded: boolean;
  payouts: AdminSellerPayout[];
  payoutStats: AdminSellerPayoutStats;
  payoutsLoading: boolean;
  payoutsLoadingMore: boolean;
  ledgerLoadingMore: boolean;
  entryType: FinancialLedgerEntryType | "ALL";
  orderGroupId: string;
  onEntryTypeChange: (value: FinancialLedgerEntryType | "ALL") => void;
  onOrderGroupIdChange: (value: string) => void;
  onLoadPayouts: (force?: boolean) => Promise<void> | void;
  onPayoutsChange: (payouts: AdminSellerPayout[]) => void;
  onLoadMorePayouts?: () => void;
  onLoadMoreLedger?: () => void;
  onRefresh: () => void;
};

type FinanceView = "payouts" | "ledger";

const ENTRY_TYPES: Array<FinancialLedgerEntryType | "ALL"> = [
  "ALL",
  "COMMISSION_ACCRUED",
  "COMMISSION_REVERSED",
  "BUYER_DELIVERY_FEE",
  "DELIVERY_COST_FORWARD",
  "DELIVERY_SUBSIDY",
  "DELIVERY_COST_RETURN",
  "BUYER_RETURN_DELIVERY_FEE",
  "REFUND_ITEM",
  "REFUND_DELIVERY",
  "SELLER_DEBIT",
  "SELLER_PAYOUT",
  "ACQUIRING_FEE",
];

export function AdminFinanceTab(props: Props) {
  const { onLoadPayouts } = props;
  const [view, setView] = useState<FinanceView>(() =>
    props.entryType !== "ALL" || props.orderGroupId.trim() ? "ledger" : "payouts"
  );
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [paymentOrders, setPaymentOrders] = useState<Record<number, string>>({});

  useEffect(() => {
    if (view === "payouts") void onLoadPayouts();
  }, [onLoadPayouts, view]);

  async function generatePayouts() {
    setActionKey("generate");
    try {
      const result = await generateAdminSellerPayouts();
      if (result.payouts.length) {
        toast.success(`Сформировано выплат: ${result.payouts.length}`);
      } else {
        toast.info("Нет сумм, доступных для выплаты");
      }
      if (result.skipped.length) {
        toast.info(`Пропущено продавцов: ${result.skipped.length}`);
      }
      await props.onLoadPayouts(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сформировать реестр");
    } finally {
      setActionKey(null);
    }
  }

  async function runPayoutAction(
    payout: AdminSellerPayout,
    action: "sent" | "paid" | "failed" | "retry" | "cancel"
  ) {
    const key = `${payout.id}:${action}`;
    if (action === "cancel" && !window.confirm("Отменить этот реестр выплаты?")) return;
    if (action === "paid" && !window.confirm("Деньги действительно списаны со счета РЦМ?")) return;

    const paymentOrderNumber = paymentOrders[payout.id]?.trim();
    if (action === "sent" && !paymentOrderNumber) {
      toast.error("Укажите номер платежного поручения");
      return;
    }

    setActionKey(key);
    try {
      const updated = await updateAdminSellerPayout(
        payout.id,
        action,
        action === "sent" ? { paymentOrderNumber } : undefined
      );
      props.onPayoutsChange(
        props.payouts.map((item) =>
          item.id === updated.id
            ? { ...updated, orderCount: item.orderCount }
            : item
        )
      );
      await props.onLoadPayouts(true);
      toast.success("Статус выплаты обновлен");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось обновить выплату");
    } finally {
      setActionKey(null);
    }
  }

  function refresh() {
    if (view === "payouts") void props.onLoadPayouts(true);
    else props.onRefresh();
  }

  function changeView(nextView: FinanceView) {
    setView(nextView);
    if (nextView === "ledger") {
      if (!props.ledgerLoaded) props.onRefresh();
    } else {
      void props.onLoadPayouts();
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Финансы</h1>
          <p>Выплаты продавцам и финансовый журнал</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            type="button"
            variant="secondary"
            loading={view === "ledger" ? props.refreshing : props.payoutsLoading}
            onClick={refresh}
          >
            Обновить
          </Button>
          {view === "payouts" ? (
            <Button
              type="button"
              variant="primary"
              disabled={actionKey === "generate"}
              loading={actionKey === "generate"}
              onClick={() => void generatePayouts()}
            >
              Сформировать реестр
            </Button>
          ) : null}
        </div>
      </header>

      <CabinetTabs<FinanceView>
        items={[
          { value: "payouts", label: "Выплаты" },
          { value: "ledger", label: "Журнал операций" },
        ]}
        value={view}
        onChange={changeView}
        appearance="segmented"
        ariaLabel="Разделы финансов админки"
      />

      {view === "payouts" ? (
        <PayoutRegistry
          payouts={props.payouts}
          stats={props.payoutStats}
          loading={props.payoutsLoading}
          loadingMore={props.payoutsLoadingMore}
          actionKey={actionKey}
          paymentOrders={paymentOrders}
          onPaymentOrderChange={(id, value) =>
            setPaymentOrders((current) => ({ ...current, [id]: value }))
          }
          onAction={(payout, action) => void runPayoutAction(payout, action)}
          onLoadMore={props.onLoadMorePayouts}
        />
      ) : (
        !props.ledgerLoaded && props.refreshing ? (
          <CabinetSkeleton variant="list" rows={4} compact />
        ) : (
          <Ledger key={props.orderGroupId} {...props} />
        )
      )}
    </section>
  );
}

function PayoutRegistry({
  payouts,
  stats,
  loading,
  loadingMore,
  actionKey,
  paymentOrders,
  onPaymentOrderChange,
  onAction,
  onLoadMore,
}: {
  payouts: AdminSellerPayout[];
  stats: AdminSellerPayoutStats;
  loading: boolean;
  loadingMore: boolean;
  actionKey: string | null;
  paymentOrders: Record<number, string>;
  onPaymentOrderChange: (id: number, value: string) => void;
  onAction: (
    payout: AdminSellerPayout,
    action: "sent" | "paid" | "failed" | "retry" | "cancel"
  ) => void;
  onLoadMore?: () => void;
}) {
  if (loading) return <CabinetSkeleton variant="list" rows={3} compact />;

  return (
    <>
      <div className={styles.summary}>
        <div><span>Готово к отправке</span><strong>{formatMoney(stats.readyAmount)}</strong></div>
        <div><span>Отправлено в банк</span><strong>{formatMoney(stats.sentAmount)}</strong></div>
        <div><span>Всего реестров</span><strong>{stats.totalCount}</strong></div>
      </div>

      {payouts.length ? (
        <>
          <div className={styles.payoutList}>
            {payouts.map((payout) => (
            <article className={styles.payoutCard} key={payout.id}>
              <div className={styles.payoutMain}>
                <div className={styles.payoutIdentity}>
                  <span>Реестр #{payout.id} · {formatDate(payout.scheduledDate)}</span>
                  <strong>{payout.sellerName}</strong>
                  <small>ИНН {payout.inn} · продавец #{payout.sellerId}</small>
                </div>
                <div className={styles.payoutAmount}>
                  <span>К выплате</span>
                  <strong>{formatMoney(payout.payoutAmount)}</strong>
                  <PayoutStatus status={payout.status} />
                </div>
              </div>

              <dl className={styles.payoutDetails}>
                <div><dt>Продажи</dt><dd>{formatMoney(payout.grossSalesAmount)}</dd></div>
                <div><dt>Комиссия</dt><dd>−{formatMoney(payout.commissionAmount)}</dd></div>
                <div><dt>Корректировки</dt><dd>−{formatMoney(payout.adjustmentsAmount)}</dd></div>
                <div>
                  <dt>Заказов</dt>
                  <dd>
                    {payout.orderCount ??
                      payout.items?.filter((item) => item.type === "ORDER").length ??
                      0}
                  </dd>
                </div>
                <div><dt>Банк</dt><dd>{payout.bankName}</dd></div>
                <div><dt>БИК</dt><dd>{payout.bik}</dd></div>
                <div><dt>Расчетный счет</dt><dd>{payout.checkingAccount}</dd></div>
                <div><dt>Платежное поручение</dt><dd>{payout.paymentOrderNumber || "—"}</dd></div>
              </dl>

              <PayoutActions
                payout={payout}
                busy={Boolean(actionKey?.startsWith(`${payout.id}:`))}
                paymentOrder={paymentOrders[payout.id] ?? ""}
                onPaymentOrderChange={(value) => onPaymentOrderChange(payout.id, value)}
                onAction={(action) => onAction(payout, action)}
              />
            </article>
            ))}
          </div>
          <ListLoadMore
            loaded={payouts.length}
            total={stats.totalCount}
            loading={loadingMore}
            onLoadMore={onLoadMore}
          />
        </>
      ) : (
        <EmptyState icon="wallet" title="Реестров пока нет" text="Сформируйте первый реестр после окончания холда по доставленным заказам." />
      )}
    </>
  );
}

function PayoutActions({
  payout,
  busy,
  paymentOrder,
  onPaymentOrderChange,
  onAction,
}: {
  payout: AdminSellerPayout;
  busy: boolean;
  paymentOrder: string;
  onPaymentOrderChange: (value: string) => void;
  onAction: (action: "sent" | "paid" | "failed" | "retry" | "cancel") => void;
}) {
  if (payout.status === "PAID" || payout.status === "CANCELLED") return null;

  return (
    <div className={styles.payoutActions}>
      {payout.status === "READY" ? (
        <input
          value={paymentOrder}
          onChange={(event) => onPaymentOrderChange(event.target.value)}
          aria-label="Номер платежного поручения"
        />
      ) : null}
      {payout.status === "READY" ? (
        <button disabled={busy} type="button" onClick={() => onAction("sent")}>Отметить отправленной</button>
      ) : null}
      {payout.status === "SENT" ? (
        <button disabled={busy} type="button" onClick={() => onAction("paid")}>Подтвердить выплату</button>
      ) : null}
      {payout.status === "SENT" ? (
        <button disabled={busy} type="button" className={styles.secondaryButton} onClick={() => onAction("failed")}>Ошибка банка</button>
      ) : null}
      {payout.status === "FAILED" ? (
        <button disabled={busy} type="button" onClick={() => onAction("retry")}>Вернуть в готовые</button>
      ) : null}
      {payout.status === "READY" || payout.status === "FAILED" ? (
        <button disabled={busy} type="button" className={styles.textButton} onClick={() => onAction("cancel")}>Отменить</button>
      ) : null}
    </div>
  );
}

function Ledger({
  entries,
  totalElements,
  entryType,
  orderGroupId,
  ledgerLoadingMore,
  onEntryTypeChange,
  onOrderGroupIdChange,
  onLoadMoreLedger,
}: Props) {
  const credit = sumByDirection(entries, "CREDIT");
  const debit = sumByDirection(entries, "DEBIT");
  const [orderGroupDraft, setOrderGroupDraft] = useState(orderGroupId);

  function applyOrderGroupFilter() {
    if (orderGroupDraft.trim() !== orderGroupId.trim()) {
      onOrderGroupIdChange(orderGroupDraft);
    }
  }

  return (
    <>
      <div className={styles.summary}>
        <div><span>Приход в загруженных</span><strong>{formatMoney(credit)}</strong></div>
        <div><span>Расход в загруженных</span><strong>{formatMoney(debit)}</strong></div>
        <div><span>Движений</span><strong>{totalElements}</strong></div>
      </div>

      <div className={adminStyles.financeFilters}>
        <label className={adminStyles.adminField}>
          <span className="textCaption">Тип движения</span>
          <select
            className={`${adminStyles.adminSelect} textSmall`}
            value={entryType}
            onChange={(event) => onEntryTypeChange(event.target.value as FinancialLedgerEntryType | "ALL")}
          >
            {ENTRY_TYPES.map((value) => <option key={value} value={value}>{formatEntryType(value)}</option>)}
          </select>
        </label>
        <label className={adminStyles.adminField}>
          <span className="textCaption">Группа заказа</span>
          <input
            className={`${adminStyles.adminInput} textSmall`}
            value={orderGroupDraft}
            onChange={(event) => setOrderGroupDraft(event.target.value)}
            onBlur={applyOrderGroupFilter}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyOrderGroupFilter();
              }
            }}
          />
        </label>
      </div>

      {entries.length ? (
        <>
          <div className={adminStyles.financeTableWrap}>
            <table className={adminStyles.financeTable}>
            <thead><tr><th scope="col">Дата</th><th scope="col">Движение</th><th scope="col">Сумма</th><th scope="col">Заказ</th><th scope="col">Участники</th><th scope="col">Описание</th></tr></thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td>{formatEntryType(entry.entryType)}</td>
                  <td className={entry.direction === "CREDIT" ? adminStyles.financeCredit : adminStyles.financeDebit}>
                    {entry.direction === "CREDIT" ? "+" : "−"}{formatMoney(Number(entry.amount))}
                  </td>
                  <td><div>Заказ {entry.orderId ?? "—"}</div><span>{entry.orderGroupId ?? "—"}</span></td>
                  <td><div>Продавец {entry.sellerId ?? "—"}</div><span>Покупатель {entry.buyerId ?? "—"}</span></td>
                  <td><div>{entry.description || "—"}</div>{entry.sellerPayoutId ? <span>Выплата #{entry.sellerPayoutId}</span> : null}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <ListLoadMore
            loaded={entries.length}
            total={totalElements}
            loading={ledgerLoadingMore}
            onLoadMore={onLoadMoreLedger}
          />
        </>
      ) : (
        <EmptyState icon="money" title="Движений нет" text="По выбранным фильтрам финансовые записи не найдены." />
      )}
    </>
  );
}

function PayoutStatus({ status }: { status: AdminSellerPayoutStatus }) {
  const labels: Record<AdminSellerPayoutStatus, string> = {
    READY: "Готова",
    SENT: "Отправлена",
    PAID: "Выплачена",
    FAILED: "Ошибка",
    CANCELLED: "Отменена",
  };
  const tones: Record<AdminSellerPayoutStatus, StatusBadgeTone> = {
    READY: "warning",
    SENT: "default",
    PAID: "success",
    FAILED: "danger",
    CANCELLED: "danger",
  };
  return <StatusBadge tone={tones[status]}>{labels[status]}</StatusBadge>;
}

function formatEntryType(value: FinancialLedgerEntryType | "ALL") {
  const labels: Partial<Record<FinancialLedgerEntryType | "ALL", string>> = {
    ALL: "Все движения",
    COMMISSION_ACCRUED: "Комиссия РЦМ",
    COMMISSION_REVERSED: "Возврат комиссии",
    BUYER_DELIVERY_FEE: "Доставка покупателя",
    DELIVERY_COST_FORWARD: "Стоимость доставки",
    DELIVERY_SUBSIDY: "Субсидия доставки",
    DELIVERY_COST_RETURN: "Обратная доставка",
    BUYER_RETURN_DELIVERY_FEE: "Удержание обратной доставки",
    REFUND_ITEM: "Возврат товара",
    REFUND_DELIVERY: "Возврат доставки",
    SELLER_DEBIT: "Удержание продавца",
    SELLER_PAYOUT: "Выплата продавцу",
    ACQUIRING_FEE: "Эквайринг",
  };
  return labels[value] ?? value;
}

function sumByDirection(entries: AdminFinancialLedgerEntry[], direction: "CREDIT" | "DEBIT") {
  return entries.filter((entry) => entry.direction === direction).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
