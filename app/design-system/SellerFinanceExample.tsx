"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { CabinetPanel } from "../components/ui/CabinetPanel";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { FormSelect } from "../components/ui/FormSelect";
import { SellerFinanceOverview, SellerFinanceOperationFilters, SellerFinanceOperationTable, SellerFinanceRemoteState, SellerPayoutDetailsDialog, SellerPayoutTable } from "../seller/components/SellerFinanceTab";
import type { SellerFinanceOperation, SellerFinanceSummary, SellerPayout, SellerPayoutDetail, SellerPayoutStatus } from "../seller/types";
import styles from "./SellerFinanceExample.module.css";

type View = "overview" | "operations" | "payouts";
type State = "ready" | "empty" | "loading" | "error" | "warning";
const views: { value: View; label: string }[] = [
  { value: "overview", label: "Обзор" }, { value: "operations", label: "Операции" }, { value: "payouts", label: "Выплаты" },
];
const states: { value: State; label: string }[] = [
  { value: "ready", label: "Данные" }, { value: "empty", label: "Пусто" }, { value: "loading", label: "Загрузка" },
  { value: "error", label: "Ошибка" }, { value: "warning", label: "Сверка" },
];
const payoutStatuses: { value: SellerPayoutStatus; label: string }[] = [
  { value: "READY", label: "Готова к отправке" }, { value: "IN_PROGRESS", label: "В обработке" },
  { value: "SENT", label: "Отправлена в банк" }, { value: "REVIEW", label: "На сверке" },
  { value: "PAID", label: "Выплачена" }, { value: "FAILED", label: "Отказ подтверждён" }, { value: "CANCELLED", label: "Отменена" },
];
const detailStates = [{ value: "ready", label: "Данные" }, { value: "loading", label: "Загрузка" }, { value: "error", label: "Ошибка" }] as const;
const operation: SellerFinanceOperation = { id: "demo-sale", type: "SALE", direction: "CREDIT", amount: 5310, currency: "RUB", orderId: 1042,
  payoutId: null, grossAmount: 5900, commissionAmount: 590, estimatedDate: false, createdAt: "2026-11-07T12:00:00Z" };
const payout: SellerPayout = { id: 101, status: "PAID", scheduledDate: "2026-11-08", payoutAmount: 5310,
  checkingAccount: "•••• 1234", paymentOrderNumber: "101", orderCount: 1 };
const payoutDetail: SellerPayoutDetail = { ...payout, currency: "RUB", grossSalesAmount: 5900, commissionAmount: 590,
  adjustmentsAmount: 0, bankName: "Демонстрационный банк", createdAt: "2026-11-07T12:00:00Z", sentAt: "2026-11-08T10:00:00Z",
  paidAt: "2026-11-08T11:00:00Z", items: [{ id: 1, type: "ORDER", orderId: 1042, grossAmount: 5900,
    commissionAmount: 590, adjustmentAmount: 0, netAmount: 5310, description: null }] };
const summary: SellerFinanceSummary = { salesAmount: 5900, commissionAmount: 590, adjustmentsAmount: 0, paidOutAmount: 0,
  estimatedBalance: 5310, availableAmount: 5310, processingAmount: 0, nextPayoutAmount: 5310, paidThisMonthAmount: 0,
  nextPayoutDate: "2026-11-08", bankDetailsReady: true, inPayoutAmount: 0, failedPayoutAmount: 0,
  reconciliationDifference: 0, nextPayout: null, payouts: [], operations: [operation] };
const blank: SellerFinanceSummary = { ...summary, salesAmount: 0, commissionAmount: 0, estimatedBalance: 0, availableAmount: 0,
  nextPayoutAmount: 0, nextPayoutDate: null, operations: [] };

export function SellerFinanceExample() {
  const [view, setView] = useState<View>("overview");
  const [state, setState] = useState<State>("ready");
  const [payoutStatus, setPayoutStatus] = useState<SellerPayoutStatus>("PAID");
  const [detailState, setDetailState] = useState<(typeof detailStates)[number]["value"]>("ready");
  const [detailOpen, setDetailOpen] = useState(false);
  const [filter, setFilter] = useState(new URLSearchParams());
  const [filterError, setFilterError] = useState("");
  const [notice, setNotice] = useState("");
  const demoSummary = state === "empty" ? blank : state === "warning" ? { ...summary, reconciliationDifference: 100, bankDetailsReady: false, failedPayoutAmount: 5310, payouts: [{ ...payout, status: "REVIEW" as const }] } : summary;
  const ops = state === "empty" ? [] : [operation].filter(item => (!filter.get("type") || item.type === filter.get("type")) && (!filter.get("orderId") || String(item.orderId) === filter.get("orderId")) && (!filter.get("from") || item.createdAt.slice(0, 10) >= filter.get("from")!) && (!filter.get("to") || item.createdAt.slice(0, 10) <= filter.get("to")!));
  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get("from") || ""), to = String(form.get("to") || "");
    if (from && to && from > to) { setFilterError("Дата начала должна быть не позже даты окончания"); return; }
    setFilterError("");
    const next = new URLSearchParams();
    for (const name of ["type", "orderId", "from", "to"]) { const value = String(form.get(name) || ""); if (value) next.set(name, value); }
    setFilter(next);
  }
  function handleLink(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) return;
    event.preventDefault();
    const url = new URL(anchor.href);
    if (url.pathname === "/seller/finance") {
      if (url.searchParams.get("payout")) setDetailOpen(true);
      else if (url.searchParams.get("view") === "payouts") setView("payouts");
      else if (url.searchParams.get("view") === "operations") { setView("operations"); setFilter(new URLSearchParams()); setFilterError(""); }
      return;
    }
    setNotice("Ссылка показана для примера — реальные данные не менялись");
  }
  const loading = state === "loading", error = state === "error" ? "Не удалось загрузить финансовые данные" : undefined;
  return <div className={styles.example} onClickCapture={handleLink} onAuxClickCapture={event => event.preventDefault()}>
    <p>Настоящие блоки финансов продавца. Выбор состояния и действия работают на условных данных</p>
    <SegmentedControl items={states} value={state} onChange={setState} ariaLabel="Состояние финансов в примере" />
    <CabinetPanel items={views} value={view} onChange={setView} variant="plain" ariaLabel="Разделы финансов в примере">
      {view === "operations" && <SellerFinanceOperationFilters key={filter.toString()} params={filter} onSubmit={applyFilter} />}
      {view === "payouts" && !loading && !error && state !== "empty" && <div className={styles.detailControls}>
        <FormSelect label="Статус выплаты в примере" value={payoutStatus} options={payoutStatuses} onChange={value => { if (value) setPayoutStatus(value); }} fieldVariant="boxed" />
        <div><p>Детализация выплаты</p><SegmentedControl items={[...detailStates]} value={detailState} onChange={setDetailState} ariaLabel="Состояние детализации выплаты" /></div>
      </div>}
      {filterError && view === "operations" && <p role="alert">{filterError}</p>}
      <SellerFinanceRemoteState loading={loading} error={error} retry={() => setState("ready")} hasData={false} />
      {!loading && !error && (view === "overview" ? <SellerFinanceOverview finance={demoSummary} />
        : view === "operations" ? <SellerFinanceOperationTable operations={ops} />
        : <SellerPayoutTable payouts={state === "empty" ? [] : [{ ...payout, status: payoutStatus }]} params={new URLSearchParams({ view: "payouts" })} />)}
    </CabinetPanel>
    {detailOpen && <SellerPayoutDetailsDialog id="101" payout={detailState === "ready" ? { ...payoutDetail, status: payoutStatus } : undefined}
      loading={detailState === "loading"} error={detailState === "error" ? "Не удалось загрузить выплату" : undefined}
      onRetry={() => setDetailState("ready")} onClose={() => setDetailOpen(false)} />}
    <p className={styles.note} role="status">{notice}</p>
  </div>;
}
