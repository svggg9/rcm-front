"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { RequestError } from "../../components/ui/RequestError";
import { Dialog } from "../../components/ui/Dialog";
import { FormSelect } from "../../components/ui/FormSelect";
import { SettingsSection } from "../../components/ui/SettingsSection";
import type { SellerDetail } from "./AdminSellerPicker";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAdminResource, type WorkspacePage } from "../lib/workspaceApi";
import { AdminSearchForm } from "./AdminSearchForm";
import { AdminPageControls, AdminResourceState, useAdminNavigation, adminPageNumber } from "./AdminWorkspaceControls";
import { AdminSellerLegalReview } from "./AdminSellerLegalReview";
import { AdminSellerBrandProfile } from "./AdminSellerBrandProfile";
import styles from "./AdminWorkspace.module.css";
type Row = { id: number; username: string; name: string | null; email: string | null; phone: string | null; approved: boolean; verified: boolean | null; brands: string | null; products: number; orders: number };
export function AdminSellerDirectory() {
  const params = useSearchParams(); const navigate = useAdminNavigation();
  const { data, loading, error, refresh } = useAdminResource<WorkspacePage<Row>>(`sellers?${new URLSearchParams({ q: params.get("q") ?? "", page: String(adminPageNumber(params.get("page"))) })}`);
  const sellerId=params.get("sellerId")??"";
  const detail=useAdminResource<SellerDetail>(/^[1-9]\d*$/.test(sellerId)?`sellers/${sellerId}`:null);
  const selected=detail.data?.seller;
  const requestedBrand=params.get("brandId");
  const selectedBrand=requestedBrand?detail.data?.brands.find(brand=>String(brand.id)===requestedBrand):detail.data?.brands[0];
  return <div className={styles.page}>
    <AdminSearchForm label="Бренд, имя, email или номер продавца" />
    <AdminResourceState loading={loading} error={error} hasData={data !== undefined} empty={data?.content.length === 0} onRetry={refresh} />
    {data && <><div className={styles.list}>{data.content.map(row => <article key={row.id} className={styles.row}>
      <div><strong>{row.brands || row.name || row.username}</strong><p className={styles.hint}>Продавец №{row.id} | {row.name || row.username}</p><p className={styles.hint}>{row.email} {row.phone ? `| ${row.phone}` : ""}</p><p className={styles.hint}>{row.products} активных товаров | {row.orders} заказов</p></div>
      <StatusBadge tone={row.approved && row.verified ? "success" : "warning"}>{!row.approved ? "Не одобрен" : row.verified ? "Реквизиты проверены" : "Проверить реквизиты"}</StatusBadge>
      <Button variant="secondary" onClick={() => navigate({ sellerId: String(row.id) })}>Открыть</Button>
    </article>)}</div><AdminPageControls page={data.number} totalPages={data.totalPages} total={data.totalElements} onChange={value => navigate({ page: String(value), sellerId: null })} /></>}
    {sellerId && <Dialog title={selected?.name || selected?.username || "Продавец"} actions={null} size="wide" mobileFullscreen onClose={() => { navigate({ sellerId: null,brandId:null }); refresh(); }}>
      <AdminResourceState loading={detail.loading} error={detail.error} onRetry={detail.refresh} />
      {selected && <div className={styles.page}><div className={styles.filters}><Link href={`/admin?tab=products&status=ALL&seller=${selected.id}`}>Товары</Link><Link href={`/admin?tab=orders&seller=${selected.id}`}>Заказы</Link><Link href={`/admin?tab=finance&financeView=ledger&seller=${selected.id}`}>Финансовые операции</Link><Link href={`/admin?tab=contact-messages&contactView=email&q=${encodeURIComponent(selected.email||selected.username)}`}>Обращения</Link></div>
        <SettingsSection title="Реквизиты продавца"><AdminSellerLegalReview sellerId={selected.id} onChanged={()=>{detail.refresh();refresh();}} /></SettingsSection>
        {!!detail.data?.brands.length && <SettingsSection title="Бренды продавца">
          <FormSelect label="Бренд" value={selectedBrand?.id??""} options={detail.data.brands.map(brand=>({value:brand.id,label:brand.name}))} onChange={id=>navigate({brandId:String(id)})} />
          {requestedBrand && !selectedBrand && <RequestError variant="inline" message="Бренд не связан с этим продавцом" secondaryAction={<Button variant="secondary" onClick={()=>navigate({brandId:null})}>Сбросить выбор</Button>} />}
          {selectedBrand && <AdminSellerBrandProfile userId={selected.id} brandId={selectedBrand.id} brandName={selectedBrand.name} status={selected.approved ? "APPROVED" : "NEW"} />}
        </SettingsSection>}
      </div>}
    </Dialog>}
  </div>;
}
