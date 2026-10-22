"use client";

import { useState } from "react";
import { InputControl } from "../../components/ui/InputControl";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { CabinetPanel } from "../../components/ui/CabinetPanel";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { AdminPayoutRegistry } from "./AdminPayoutRegistry";
import type { AdminFinancialLedgerEntry, FinancialLedgerEntryType } from "../types";
import adminStyles from "../Admin.module.css";
import styles from "./AdminFinanceTab.module.css";

type Props = {
  entries: AdminFinancialLedgerEntry[];
  totalElements: number;
  refreshing: boolean;
  ledgerLoaded: boolean;
  ledgerLoadingMore: boolean;
  entryType: FinancialLedgerEntryType | "ALL";
  orderGroupId: string;
  onEntryTypeChange: (value: FinancialLedgerEntryType | "ALL") => void;
  onOrderGroupIdChange: (value: string) => void;
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
  const [view, setView] = useState<FinanceView>(() =>
    props.entryType !== "ALL" || props.orderGroupId.trim() ? "ledger" : "payouts"
  );
  function changeView(nextView: FinanceView) {
    setView(nextView);
    if (nextView === "ledger" && !props.ledgerLoaded) props.onRefresh();
  }
  return <section className={styles.page}>
    <header className={styles.header}><div><h1>Финансы</h1><p>Выплаты продавцам и финансовый журнал</p></div></header>
    <CabinetPanel<FinanceView> items={[{ value: "payouts", label: "Выплаты" }, { value: "ledger", label: "Журнал операций" }]}
      value={view} onChange={changeView} ariaLabel="Разделы финансов админки"
      actions={view === "ledger" ? <Button loading={props.refreshing} onClick={props.onRefresh}>Обновить</Button> : undefined}>
      {view === "payouts" ? <AdminPayoutRegistry /> : !props.ledgerLoaded && props.refreshing
        ? <CabinetSkeleton variant="list" rows={4} compact /> : <Ledger key={props.orderGroupId} {...props} />}
    </CabinetPanel>
  </section>;
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
        <label className={adminStyles.adminField} data-ui="field">
          <span className="textCaption">Тип движения</span>
          <select
            className={`${adminStyles.adminSelect} textSmall`}
            value={entryType}
            onChange={(event) => onEntryTypeChange(event.target.value as FinancialLedgerEntryType | "ALL")}
          >
            {ENTRY_TYPES.map((value) => <option key={value} value={value}>{formatEntryType(value)}</option>)}
          </select>
        </label>
        <label className={adminStyles.adminField} data-ui="field">
          <span className="textCaption">Группа заказа</span>
          <InputControl spacePolicy="remove"
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
        <EmptyState icon="money" title="Движений нет" text="По выбранным фильтрам финансовые записи не найдены" />
      )}
    </>
  );
}

function formatEntryType(value: FinancialLedgerEntryType | "ALL") {
  const labels: Partial<Record<FinancialLedgerEntryType | "ALL", string>> = {
    ALL: "Все движения",
    COMMISSION_ACCRUED: "Комиссия рцмаркет",
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
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
