"use client";
import { useSearchParams } from "next/navigation";
import { CabinetPanel } from "../../components/ui/CabinetPanel";
import { AdminPayoutRegistry } from "./AdminPayoutRegistry";
import { AdminLedger } from "./AdminLedger";
import { useAdminNavigation } from "./AdminWorkspaceControls";
import type { AdminFinancialLedgerEntry, FinancialLedgerEntryType } from "../types";
import styles from "./AdminWorkspace.module.css";

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


export function AdminFinanceTab(props: Props) {
  const params=useSearchParams(); const navigate=useAdminNavigation();
  const ledger=params.get("financeView")==="ledger" || !!params.get("seller") || props.entryType!=="ALL" || !!props.orderGroupId.trim();
  return <section className={styles.page}><header className={styles.header}><h1>Финансы</h1></header>
    <CabinetPanel items={[{value:"payouts",label:"Выплаты"},{value:"ledger",label:"Журнал операций"}]}
      value={ledger?"ledger":"payouts"} onChange={value=>navigate({financeView:value==="ledger"?"ledger":null,entryType:null,orderGroupId:null,seller:null,from:null,to:null,page:null})} ariaLabel="Разделы финансов админки">
      {ledger?<AdminLedger/>:<AdminPayoutRegistry/>}
    </CabinetPanel>
  </section>;
}
