import { EmptyState } from "../../components/ui/EmptyState";

import styles from "../Admin.module.css";
import type {
  AdminFinancialLedgerEntry,
  FinancialLedgerEntryType,
} from "../types";

type Props = {
  entries: AdminFinancialLedgerEntry[];
  totalElements: number;
  refreshing: boolean;
  entryType: FinancialLedgerEntryType | "ALL";
  orderGroupId: string;
  onEntryTypeChange: (value: FinancialLedgerEntryType | "ALL") => void;
  onOrderGroupIdChange: (value: string) => void;
  onRefresh: () => void;
};

const ENTRY_TYPES: Array<FinancialLedgerEntryType | "ALL"> = [
  "ALL",
  "COMMISSION_ACCRUED",
  "BUYER_DELIVERY_FEE",
  "DELIVERY_COST_FORWARD",
  "DELIVERY_SUBSIDY",
  "DELIVERY_COST_RETURN",
  "REFUND_ITEM",
  "REFUND_DELIVERY",
  "SELLER_DEBIT",
  "SELLER_PAYOUT",
  "ACQUIRING_FEE",
];

function formatEntryType(value: FinancialLedgerEntryType | "ALL") {
  switch (value) {
    case "ALL":
      return "Все движения";
    case "COMMISSION_ACCRUED":
      return "Комиссия RCM";
    case "BUYER_DELIVERY_FEE":
      return "Доставка покупателя";
    case "DELIVERY_COST_FORWARD":
      return "Стоимость доставки";
    case "DELIVERY_SUBSIDY":
      return "Субсидия доставки";
    case "DELIVERY_COST_RETURN":
      return "Обратная доставка";
    case "REFUND_ITEM":
      return "Возврат товара";
    case "REFUND_DELIVERY":
      return "Возврат доставки";
    case "SELLER_DEBIT":
      return "Списание с продавца";
    case "SELLER_PAYOUT":
      return "Выплата продавцу";
    case "ACQUIRING_FEE":
      return "Эквайринг";
    default:
      return value;
  }
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "RUB",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function sumByDirection(
  entries: AdminFinancialLedgerEntry[],
  direction: "CREDIT" | "DEBIT"
) {
  return entries
    .filter((entry) => entry.direction === direction)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

export function AdminFinanceTab({
  entries,
  totalElements,
  refreshing,
  entryType,
  orderGroupId,
  onEntryTypeChange,
  onOrderGroupIdChange,
  onRefresh,
}: Props) {
  const credit = sumByDirection(entries, "CREDIT");
  const debit = sumByDirection(entries, "DEBIT");
  const net = credit - debit;
  const currency = entries[0]?.currency || "RUB";

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={`${styles.sectionTitleNoMargin} textTitle`}>
            Финансы
          </h1>
          <div className={`${styles.muted} textCaption`}>
            Движений: {totalElements}
          </div>
        </div>

        <button
          type="button"
          className={`${styles.refreshBtn} textButton`}
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Обновляем…" : "Обновить"}
        </button>
      </div>

      <div className={styles.financeSummary}>
        <div>
          <span className="textCaption">Приход</span>
          <strong className="textBody">{formatMoney(credit, currency)}</strong>
        </div>
        <div>
          <span className="textCaption">Расход</span>
          <strong className="textBody">{formatMoney(debit, currency)}</strong>
        </div>
        <div>
          <span className="textCaption">Net</span>
          <strong className="textBody">{formatMoney(net, currency)}</strong>
        </div>
      </div>

      <div className={styles.financeFilters}>
        <label className={styles.adminField}>
          <span className="textCaption">Тип движения</span>
          <select
            className={`${styles.adminSelect} textSmall`}
            value={entryType}
            onChange={(event) =>
              onEntryTypeChange(
                event.target.value as FinancialLedgerEntryType | "ALL"
              )
            }
          >
            {ENTRY_TYPES.map((value) => (
              <option key={value} value={value}>
                {formatEntryType(value)}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.adminField}>
          <span className="textCaption">Order group</span>
          <input
            className={`${styles.adminInput} textSmall`}
            value={orderGroupId}
            onChange={(event) => onOrderGroupIdChange(event.target.value)}
            placeholder="UUID группы заказа"
          />
        </label>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="Движений нет"
          text="По выбранным фильтрам финансовые записи не найдены."
        />
      ) : (
        <div className={styles.financeTableWrap}>
          <table className={styles.financeTable}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Движение</th>
                <th>Сумма</th>
                <th>Заказ</th>
                <th>Участники</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.createdAt)}</td>
                  <td>{formatEntryType(entry.entryType)}</td>
                  <td
                    className={
                      entry.direction === "CREDIT"
                        ? styles.financeCredit
                        : styles.financeDebit
                    }
                  >
                    {entry.direction === "CREDIT" ? "+" : "-"}
                    {formatMoney(Number(entry.amount), entry.currency)}
                  </td>
                  <td>
                    <div>Order {entry.orderId ?? "—"}</div>
                    <span>{entry.orderGroupId ?? "—"}</span>
                  </td>
                  <td>
                    <div>seller {entry.sellerId ?? "—"}</div>
                    <span>buyer {entry.buyerId ?? "—"}</span>
                  </td>
                  <td>
                    <div>{entry.description || "—"}</div>
                    {entry.paymentId ? (
                      <span>payment {entry.paymentId}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
