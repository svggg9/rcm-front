"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { adminDate, useAdminResource, type WorkspacePage } from "../lib/workspaceApi";
import { AdminSearchForm } from "./AdminSearchForm";
import { AdminPageControls, AdminResourceState, useAdminNavigation, adminPageNumber } from "./AdminWorkspaceControls";
import styles from "./AdminWorkspace.module.css";

export type AdminActivityRow = { id: number; actor: string; method: string; path: string; objectLabel:string|null; changes:string; reason: string | null; httpStatus: number; createdAt: string };
type Row = AdminActivityRow;
const actions:Record<string,string>={begin:"Начало обработки",review:"Проверка результата",failed:"Фиксация отказа",verify:"Подтверждение реквизитов",reopen:"Разрешение редактирования",generate:"Формирование выплат",approve:"Одобрение",publish:"Публикация",block:"Блокировка",unblock:"Возврат в черновик",revision:"Запрос доработки",refund:"Запрос возврата оплаты",category:"Назначение категории",sent:"Передача в банк",paid:"Подтверждение выплаты",order:"Изменение порядка",sync:"Сверка доставки",reject:"Отклонение",cancel:"Отмена",items:"Изменение состава",retry:"Повторная обработка"};
function describe(row:Row) {
  const path=row.path;
  const rules:[RegExp,string,string][]=[[/^\/api\/admin\/finance\/payouts\/(\d+)/,"Выплата","/admin?tab=finance&payoutId="],
    [/^\/api\/admin\/storefront\/home\/new-arrivals/,"Новинки главной","/admin?tab=storefront"],
    [/^\/api\/admin\/seller-applications\/(\d+)/,"Заявка продавца","/admin?tab=sellers&sellerView=applications"],[/^\/api\/admin\/products\/(\d+)/,"Товар","/admin?tab=products&productId="],
    [/^\/api\/admin\/orders\/(\d+)/,"Заказ","/admin?tab=orders&orderId="],
    [/^\/api\/delivery\/shipments\/order\/(\d+)/,"Доставка заказа","/admin?tab=orders&orderId="],
    [/^\/api\/admin\/storefront\/home\/collections(?:\/(\d+))?/,"Подборка","/admin?tab=storefront"],
    [/^\/api\/admin\/storefront\/home\/sections(?:\/(\d+))?/,"Раздел главной","/admin?tab=storefront"],
    [/^\/api\/admin\/seller[^/]*\/(\d+)/,"Продавец","/admin?tab=sellers&sellerId="],
    [/^\/api\/admin\/dictionaries\/brands(?:\/(\d+))?/,"Бренд","/admin?tab=dictionaries"],
    [/^\/api\/admin\/contact-messages(?:\/(\d+))?/,"Обращение Email","/admin?tab=contact-messages&contactView=email"],
    [/^\/api\/admin\/support-chats(?:\/(\d+))?/,"Диалог поддержки","/admin?tab=contact-messages"]];
  const route=rules.find(([pattern])=>pattern.test(path));const match=route?.[0].exec(path);
  const label=row.objectLabel|| (route?`${route[1]}${match?.[1]?` №${match[1]}`:""}`:"Административная операция");
  const href=route?route[2]+(route[2].endsWith("=")?(match?.[1]??""):""):null;
  const last=path.split("/").at(-1)??"";
  const action=actions[last]||(row.method==="DELETE"?"Удаление":row.method==="POST"&&["collections","sections","brands","categories"].includes(last)?"Создание":"Изменение");
  return {label,href,action};
}
const statuses:Record<string,string>={DRAFT:"Черновик",ACTIVE:"Активен",BLOCKED:"Заблокирован",MODERATION:"На модерации",NEEDS_REVISION:"Нужны исправления",DELETED:"Удалён",ARCHIVED:"В архиве",CATEGORY:"Категория",COLLECTION:"Подборка"};
function display(value:unknown):string {return value===null||value===undefined?"—":typeof value==="boolean"?(value?"Да":"Нет"):statuses[String(value)]??String(value);}
function changes(raw:string):{field:string;before:unknown;after:unknown}[] {try {const data:unknown=JSON.parse(raw);return Array.isArray(data)?data.filter(item=>item&&typeof item.field==="string"):[];}catch{return [];}}

export function AdminActivityEntry({ row, compact = false }: { row: AdminActivityRow; compact?: boolean }) {
  const item=describe(row),diff=compact?[]:changes(row.changes);
  return <article className={styles.row}>
    <div><strong>{item.action}</strong><p>{item.href?<Link className={styles.titleLink} href={item.href}>{item.label}</Link>:item.label}</p><p className={styles.hint}>{row.actor} | {adminDate(row.createdAt)}</p>{!compact&&row.reason&&<p>{row.reason}</p>}
      {!!diff.length && <details className={styles.changeDetails}><summary>Что изменилось</summary><dl>{diff.map(change=><div key={change.field}><dt>{change.field}</dt><dd>{display(change.before)} → {display(change.after)}</dd></div>)}</dl></details>}
    </div><StatusBadge tone={row.httpStatus<400?"success":"danger"}>{row.httpStatus<400?"Запрос выполнен":`Ошибка ${row.httpStatus}`}</StatusBadge>
  </article>;
}

export function AdminActivityTab() {
  const params = useSearchParams(); const navigate = useAdminNavigation();
  const { data, loading, error, refresh } = useAdminResource<WorkspacePage<Row>>(`activity?${new URLSearchParams({ q: params.get("q") ?? "", page: String(adminPageNumber(params.get("page"))) })}`);
  return <section className={styles.page}>
    <header className={styles.header}><div><h1>История действий</h1><p>Операции администраторов с момента подключения журнала</p></div><Button variant="secondary" loading={loading} onClick={refresh}>Обновить</Button></header>
    <AdminSearchForm label="Администратор, объект или причина" />
    <AdminResourceState loading={loading} error={error} hasData={data !== undefined} empty={data?.content.length === 0} onRetry={refresh} />
    {data && <><div className={styles.list}>{data.content.map(row => <AdminActivityEntry key={row.id} row={row} />)}</div><AdminPageControls page={data.number} totalPages={data.totalPages} total={data.totalElements} onChange={value=>navigate({page:String(value)})} /></>}
  </section>;
}
