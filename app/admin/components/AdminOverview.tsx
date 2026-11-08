"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { DesignSystemIcon } from "../../components/ui/DesignSystemIcon";
import { MetricGrid } from "../../components/ui/MetricGrid";
import { Price } from "../../components/ui/Price";
import { SectionLoader } from "../../components/ui/SectionLoader";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { TimeSeriesChart } from "../../components/ui/TimeSeriesChart";
import { DASHBOARD_PERIODS, dashboardPeriod, type AdminDashboard } from "../lib/adminDashboard";
import { adminDate, adminMoney, useAdminResource, type WorkspacePage } from "../lib/workspaceApi";
import { AdminActivityEntry, type AdminActivityRow } from "./AdminActivityTab";
import { AdminResourceState, useAdminNavigation } from "./AdminWorkspaceControls";
import { AdminOperationAlerts } from "./AdminOperationAlerts";
import styles from "./AdminWorkspace.module.css";
import dashboardStyles from "./AdminOverview.module.css";

type Queue = {key:string; count:number; oldestAt:string|null; objectId:number|null; priority:number};
const tasks:Record<string,{label:string;href:string;object?:(id:number)=>string}>={
  products:{label:"Товары на модерации",href:"/admin?tab=products",object:id=>`/admin?tab=products&productId=${id}`},
  sellers:{label:"Новые продавцы",href:"/admin?tab=sellers&sellerView=applications"},
  requisites:{label:"Изменение реквизитов",href:"/admin?tab=sellers&sellerView=applications",object:id=>`/admin?tab=sellers&sellerId=${id}`},
  returns:{label:"Заявки на возврат",href:"/admin?tab=returns",object:id=>`/admin?tab=orders&orderId=${id}`},
  payments:{label:"Проверка оплат",href:"/admin?tab=orders&orderView=payments",object:id=>`/admin?tab=orders&orderId=${id}`},
  refunds:{label:"Возвраты денег",href:"/admin?tab=orders&orderView=refunds",object:id=>`/admin?tab=orders&orderId=${id}`},
  payouts:{label:"Выплаты требуют внимания",href:"/admin?tab=finance",object:id=>`/admin?tab=finance&payoutId=${id}`},
  deliveries:{label:"Проблемы доставки",href:"/admin?tab=delivery",object:id=>`/admin?tab=orders&orderId=${id}`},
  chats:{label:"Новые диалоги",href:"/admin?tab=contact-messages"},
  messages:{label:"Новые обращения Email",href:"/admin?tab=contact-messages&contactView=email"},
};
export function AdminOverview() {
  const params=useSearchParams();
  const navigate=useAdminNavigation();
  const period=dashboardPeriod(params.get("period"));
  const [metric,setMetric]=useState<"orders"|"turnover">("orders");
  const queuesResource=useAdminResource<Queue[]>("overview");
  const analytics=useAdminResource<AdminDashboard>(`dashboard?period=${period}`);
  const activity=useAdminResource<WorkspacePage<AdminActivityRow>>("activity?page=0&size=5");
  const queues=(queuesResource.data??[]).filter(row=>tasks[row.key]);
  const pending=queues.filter(row=>row.count>0).sort((a,b)=>a.priority-b.priority||(a.oldestAt??"9999").localeCompare(b.oldestAt??"9999"));
  const loading=queuesResource.loading||analytics.loading||activity.loading;
  const refresh=()=>{queuesResource.refresh();analytics.refresh();activity.refresh();};
  const data=analytics.data;
  const denied=[queuesResource,analytics,activity].find(resource=>resource.status===401||resource.status===403);
  if (denied) return <section className={dashboardStyles.page}>
    <header className={styles.header}><h1>Обзор</h1></header>
    <AdminResourceState loading={loading} error={denied.error??"Войдите заново, чтобы открыть обзор"} onRetry={refresh} />
  </section>;
  const initialLoading=loading&&!queuesResource.data&&!data&&!activity.data&&!queuesResource.error&&!analytics.error&&!activity.error;
  const taskCard=(row:Queue)=><Link key={row.key} href={tasks[row.key].href} className={`${dashboardStyles.taskCard} ${row.priority===1?dashboardStyles.urgent:""}`}>
    <span>{tasks[row.key].label}</span><strong>{row.count}</strong><span className={dashboardStyles.taskFooter}><span>{row.oldestAt?`Самая ранняя: ${adminDate(row.oldestAt)}`:"Открыть очередь"}</span><DesignSystemIcon name="chevron-right" role="utility" /></span>
  </Link>;
  return <section className={dashboardStyles.page}>
    <header className={styles.header}><div><h1>Обзор</h1><p>Главное о работе рцмаркет</p></div><Button variant="secondary" loading={loading} onClick={refresh}>Обновить</Button></header>
    {initialLoading?<SectionLoader label="Загрузка обзора" />:<>
      <section className={dashboardStyles.section} aria-labelledby="dashboard-tasks">
        <div className={dashboardStyles.sectionHead}><h2 id="dashboard-tasks">Требует внимания</h2>{queuesResource.data&&<span className="textHint">Очередей с задачами: {pending.length}</span>}</div>
        <AdminResourceState loading={queuesResource.loading} error={queuesResource.error} hasData={queuesResource.data!==undefined} onRetry={queuesResource.refresh} />
        {queuesResource.data&&<>{pending.length?<div className={dashboardStyles.taskGrid}>{pending.slice(0,4).map(taskCard)}</div>:<p className="textHint">В рабочих очередях нет новых задач</p>}
          {(pending.length>4||queues.some(row=>row.count===0))&&<details className={dashboardStyles.moreTasks}><summary>Все рабочие очереди</summary>
            {pending.length>4&&<div className={dashboardStyles.taskGrid}>{pending.slice(4).map(taskCard)}</div>}
            <div className={styles.calmQueues}>{queues.filter(row=>row.count===0).map(row=><Link key={row.key} href={tasks[row.key].href}>{tasks[row.key].label}<span>0</span></Link>)}</div>
          </details>}</>}
      </section>
      <AdminOperationAlerts />
      <section className={dashboardStyles.section} aria-labelledby="dashboard-performance">
        <div className={dashboardStyles.sectionHead}><div><h2 id="dashboard-performance">Показатели</h2><p className="textHint">По московскому времени</p></div>
          <SegmentedControl ariaLabel="Период показателей" value={period} items={DASHBOARD_PERIODS} onChange={value=>navigate({period:value})} /></div>
        <AdminResourceState loading={analytics.loading} error={analytics.error} hasData={data!==undefined} onRetry={analytics.refresh} />
        {data&&<>
          <MetricGrid ariaLabel="Показатели продаж" items={[
            {label:"Оплаченные заказы",value:data.totals.orders.toLocaleString("ru-RU"),hint:"Одна покупка у нескольких продавцов — один заказ"},
            {label:"Оборот товаров",value:<Price amount={data.totals.turnover} maximumFractionDigits={2} />,hint:"Без стоимости доставки"},
            {label:"Средний чек",value:<Price amount={data.totals.averageOrder} maximumFractionDigits={2} />,hint:"По оплаченным заказам"},
            {label:"Возвращено покупателям",value:<Price amount={data.totals.refunds} maximumFractionDigits={2} />,hint:"Успешные возвраты денег за период"},
          ]} />
          <div className={dashboardStyles.chartHead}><h3>Динамика</h3><SegmentedControl ariaLabel="Показатель графика" value={metric} onChange={setMetric} items={[{value:"orders",label:"Заказы"},{value:"turnover",label:"Оборот"}]} /></div>
          <TimeSeriesChart key={period} points={data.series.map(day=>({date:day.date,value:day[metric]}))} label={metric==="orders"?"Оплаченные заказы":"Оборот товаров"}
            formatValue={value=>metric==="orders"?value.toLocaleString("ru-RU",{maximumFractionDigits:0}):adminMoney(value,"RUB")} />
          {data.totals.orders===0&&<p className="textHint">За выбранный период оплаченных заказов нет</p>}
          <details className={dashboardStyles.explanation}><summary>{data.totals.estimatedOrderDates>0||data.totals.estimatedRefundDates>0?"Есть приблизительные даты · Как считаются показатели":"Как считаются показатели"}</summary>
            <p>Оборот — стоимость товаров в оплаченных покупках, без доставки. Возвраты показаны отдельно и не вычитаются из оборота. Это оборот маркетплейса, а не доход площадки.</p>
            {(data.totals.estimatedOrderDates>0||data.totals.estimatedRefundDates>0)&&<p>В старых данных часть дат приблизительная: заказов — {data.totals.estimatedOrderDates}, возвратов — {data.totals.estimatedRefundDates}. Для заказов без даты оплаты используется дата создания, для возвратов без даты завершения — дата последнего обновления.</p>}
          </details>
          <p className="textHint">Обновлено {adminDate(data.generatedAt)}</p>
        </>}
      </section>
      <section className={dashboardStyles.section} aria-labelledby="dashboard-activity">
        <div className={dashboardStyles.sectionHead}><h2 id="dashboard-activity">Последние события</h2><Link className={styles.actionLink} href="/admin?tab=activity">Вся история</Link></div>
        <AdminResourceState loading={activity.loading} error={activity.error} hasData={activity.data!==undefined} onRetry={activity.refresh} />
        {activity.data&&(activity.data.content.length?<div className={styles.list}>{activity.data.content.map(row=><AdminActivityEntry compact key={row.id} row={row} />)}</div>:<p className="textHint">Действий пока нет</p>)}
      </section>
    </>}
  </section>;
}
