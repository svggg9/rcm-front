"use client";
import { DataTable } from "../../components/ui/DataTable";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { FormSelect } from "../../components/ui/FormSelect";
import { RequestError } from "../../components/ui/RequestError";
import { API_URL } from "../../lib/api";
import { readApiBlob, readApiError, toApiError } from "../../lib/apiErrors";
import { requestApiResponse } from "../../lib/apiRequest";
import { adminDate, adminMoney, useAdminResource, type WorkspacePage } from "../lib/workspaceApi";
import { AdminPageControls, AdminResourceState, useAdminNavigation, adminPageNumber } from "./AdminWorkspaceControls";
import { AdminSellerPicker } from "./AdminSellerPicker";
import styles from "./AdminWorkspace.module.css";

type Row = { id: number; entryType: string; direction: string; amount: number; currency: string; orderId: number | null; orderGroupId: string | null; sellerId: number | null; sellerPayoutId: number | null; description: string; createdAt: string };
type Data = { page: WorkspacePage<Row>; totals: { currency: string; credit: number; debit: number }[] };
const labels: Record<string,string> = { COMMISSION_ACCRUED: "Комиссия рцмаркет", COMMISSION_REVERSED: "Возврат комиссии", BUYER_DELIVERY_FEE: "Доставка покупателя", DELIVERY_COST_FORWARD: "Стоимость доставки", DELIVERY_SUBSIDY: "Субсидия доставки", DELIVERY_COST_RETURN: "Обратная доставка", BUYER_RETURN_DELIVERY_FEE: "Удержание обратной доставки", REFUND_ITEM: "Возврат товара", REFUND_DELIVERY: "Возврат доставки", SELLER_DEBIT: "Удержание продавца", SELLER_PAYOUT: "Выплата продавцу", ACQUIRING_FEE: "Эквайринг" };

export function AdminLedger() {
  const params = useSearchParams(); const navigate = useAdminNavigation();
  const [exporting, setExporting] = useState(false); const [exportError, setExportError] = useState("");
  const query = new URLSearchParams({ type: params.get("entryType") ?? "", group: params.get("orderGroupId") ?? "", seller: params.get("seller") ?? "", page: String(adminPageNumber(params.get("page"))) });
  for (const name of ["from", "to"]) if (params.get(name)) query.set(name, params.get(name)!);
  const { data, error, loading, refresh } = useAdminResource<Data>(`ledger?${query}`);
  async function download() {
    if (exporting) return;
    setExporting(true); setExportError("");
    try {
      const response = await requestApiResponse(`${API_URL}/api/admin/workspace/ledger.csv?${query}`, {}, "Не удалось выгрузить операции — попробуйте ещё раз");
      if (!response.ok) throw await readApiError(response, "Не удалось выгрузить операции — проверьте период и ограничьте выборку до 10 000 записей");
      const url = URL.createObjectURL(await readApiBlob(response, "Не удалось прочитать выгрузку — попробуйте ещё раз")); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "rcmarket-ledger.csv"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setExportError(toApiError(reason, "Не удалось выгрузить операции — попробуйте ещё раз").message); }
    finally { setExporting(false); }
  }
  function change(key: string, value: string) { navigate({ [key]: value || null, page: null, financeView: "ledger" }); }
  return <div className={styles.page}>
    <div className={styles.filters}>
      <FormSelect label="Тип операции" value={params.get("entryType") ?? ""} emptyOptionLabel="Все операции" options={Object.entries(labels).map(([value,label]) => ({value,label}))} onChange={value => change("entryType",String(value))} />
      <TextInput type="date" label="С даты" value={params.get("from") ?? ""} max={params.get("to") || undefined} onChange={event => change("from",event.target.value)} />
      <TextInput type="date" label="По дату" value={params.get("to") ?? ""} min={params.get("from") || undefined} onChange={event => change("to",event.target.value)} />
    </div>
    <div className={styles.filters}>
      <TextInput key={`group:${params.get("orderGroupId")}`} label="Группа заказа" spacePolicy="remove" defaultValue={params.get("orderGroupId") ?? ""} onBlur={event => change("orderGroupId",event.target.value.trim())} />
      <AdminSellerPicker value={params.get("seller")??""} onChange={value=>change("seller",value)} />
      <Button variant="secondary" loading={loading} onClick={refresh}>Обновить</Button><Button variant="secondary" loading={exporting} onClick={() => void download()}>Скачать CSV</Button>
    </div>
    {exportError && <RequestError variant="inline" message={exportError} />}
    <AdminResourceState loading={loading} error={error} hasData={data !== undefined} empty={data?.page.content.length === 0} onRetry={refresh} />
    {data && <>
      <div className={styles.grid}>{data.totals.map(total => <div key={total.currency} className={styles.tile}><span>За весь выбранный период | {total.currency}</span><strong>Приход {adminMoney(total.credit,total.currency)}</strong><strong>Расход {adminMoney(total.debit,total.currency)}</strong></div>)}</div>
      {!!data.page.content.length && <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Финансовые операции"><DataTable className={styles.table}><thead><tr><th scope="col">Дата</th><th scope="col">Операция</th><th scope="col">Сумма</th><th scope="col">Заказ</th><th scope="col">Продавец</th><th scope="col">Выплата</th></tr></thead><tbody>{data.page.content.map(row => <tr key={row.id}>
        <td>{adminDate(row.createdAt)}</td><td>{labels[row.entryType] ?? row.entryType}</td><td className={styles.number}>{row.direction === "CREDIT" ? "+" : "−"}{adminMoney(row.amount,row.currency)}</td>
        <td>{row.orderId ? <Link href={`/admin?tab=orders&orderId=${row.orderId}`}>№{row.orderId}</Link> : "—"}</td>
        <td>{row.sellerId ? <Link href={`/admin?tab=sellers&q=${row.sellerId}&sellerId=${row.sellerId}`}>№{row.sellerId}</Link> : "—"}</td>
        <td>{row.sellerPayoutId ? <Link href={`/admin?tab=finance&payoutId=${row.sellerPayoutId}`}>№{row.sellerPayoutId}</Link> : "—"}</td>
      </tr>)}</tbody></DataTable></div>}
      <AdminPageControls page={data.page.number} totalPages={data.page.totalPages} total={data.page.totalElements} onChange={value => navigate({ page: String(value) })} />
    </>}
  </div>;
}
