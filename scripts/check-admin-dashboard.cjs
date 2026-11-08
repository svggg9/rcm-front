/* eslint-disable @typescript-eslint/no-require-imports -- Isolated dashboard contracts and real SSR components, no live mutations. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const React = require("react");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup: render } = require("react-dom/server");
const css = { default: new Proxy({}, { get: (_, key) => key }) };
function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file,"utf8"),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const testModule={exports:{}};
  new Function("module","exports","require",code)(testModule,testModule.exports,name=>{
    if(name==="react") return React;
    if(name==="react/jsx-runtime") return jsx;
    assert(name in deps,`Unexpected import ${name}`);return deps[name];
  });return testModule.exports;
}
const model=load("app/admin/lib/adminDashboard.ts");
const fixture={period:7,from:"2026-10-23",to:"2026-10-29",timezone:"Europe/Moscow",currency:"RUB",generatedAt:"2026-10-29T12:00:00+03:00",
  totals:{orders:3,turnover:3000,averageOrder:1000,refunds:100,estimatedOrderDates:0,estimatedRefundDates:0},
  series:Array.from({length:7},(_,i)=>({date:`2026-10-${23+i}`,orders:i===6?3:0,turnover:i===6?3000:0,refunds:i===6?100:0}))};
assert(model.isAdminDashboard(fixture,"7"));assert(!model.isAdminDashboard(fixture,"30"));
for(const corrupt of [null,{}, {...fixture,totals:{...fixture.totals,turnover:999}}, {...fixture,series:fixture.series.slice(1)},
  {...fixture,currency:"USD"}, {...fixture,series:fixture.series.map((row,i)=>i===0?{...row,date:"2026-02-30"}:row)},
  {...fixture,totals:{...fixture.totals,averageOrder:NaN}}, {...fixture,totals:{...fixture.totals,averageOrder:100}},
  {...fixture,totals:{...fixture.totals,estimatedOrderDates:4}}]) assert(!model.isAdminDashboard(corrupt,"7"));
assert.equal(model.dashboardPeriod(null),"7");assert.equal(model.dashboardPeriod("30"),"30");assert.equal(model.dashboardPeriod("bad"),"7");
const {MetricGrid}=load("app/components/ui/MetricGrid.tsx",{"./MetricGrid.module.css":css});
const {TimeSeriesChart}=load("app/components/ui/TimeSeriesChart.tsx",{"./TimeSeriesChart.module.css":css});
const Link=({children,...props})=>jsx.jsx("a",{...props,children});
const Resource=({loading,error})=>error?jsx.jsx("aside",{children:error}):loading?jsx.jsx("span",{role:"status"}):null;
let resourceError=false;
let resourceStatus;
const selectedPeriod="7";
const keys=["payments","refunds","payouts","deliveries","returns","requisites","products","sellers","chats","messages"];
const queues=keys.map((key,i)=>({key,count:i<8?i+1:0,oldestAt:"2026-10-23T00:00:00Z",objectId:1,priority:i<3?1:2}));
const {AdminOverview}=load("app/admin/components/AdminOverview.tsx",{
  "next/link":{default:Link},"next/navigation":{useSearchParams:()=>new URLSearchParams({period:selectedPeriod})},
  "../../components/ui/Button":{Button:({children})=>jsx.jsx("button",{children})},
  "../../components/ui/DesignSystemIcon":{DesignSystemIcon:()=>null},"../../components/ui/MetricGrid":{MetricGrid},
  "../../components/ui/Price":{Price:({amount})=>jsx.jsx("span",{children:`${amount} ₽`})},
  "../../components/ui/SectionLoader":{SectionLoader:()=>jsx.jsx("span",{role:"status"})},
  "../../components/ui/SegmentedControl":{SegmentedControl:({ariaLabel})=>jsx.jsx("div",{"aria-label":ariaLabel})},
  "../../components/ui/TimeSeriesChart":{TimeSeriesChart},"../lib/adminDashboard":model,
  "../lib/workspaceApi":{adminDate:v=>v||"—",adminMoney:v=>`${v} ₽`,useAdminResource:path=>({
    data:path==="overview"?queues:path.startsWith("activity")?{content:[{id:1,objectLabel:"Настройка главной"}]}:resourceError?undefined:fixture,
    loading:false,error:resourceError&&path.startsWith("dashboard")?"Не удалось загрузить показатели":undefined,status:path.startsWith("dashboard")?resourceStatus:undefined,refresh(){},
  })},
  "./AdminActivityTab":{AdminActivityEntry:({row})=>jsx.jsx("article",{children:row.objectLabel})},
  "./AdminOperationAlerts":{AdminOperationAlerts:()=>null},
  "./AdminWorkspaceControls":{AdminResourceState:Resource,useAdminNavigation:()=>()=>{}},
  "./AdminWorkspace.module.css":css,"./AdminOverview.module.css":css,
});
const html=render(jsx.jsx(AdminOverview,{}));
for(const label of ["Требует внимания","Оплаченные заказы","Оборот товаров","Средний чек","Возвращено покупателям","Последние события","Настройка главной","Все рабочие очереди"]) assert(html.includes(label));
assert(html.includes('href="/admin?tab=returns"'));assert(html.includes('href="/admin?tab=activity"'));
assert(html.indexOf("Требует внимания")<html.indexOf("Показатели")&&html.indexOf("Показатели")<html.indexOf("Последние события"));
assert(html.includes("Данные по дням")&&html.includes("Стрелки влево и вправо"));
resourceError=true;
const partial=render(jsx.jsx(AdminOverview,{}));
assert(partial.includes("Не удалось загрузить показатели"));assert(partial.includes("Настройка главной"));assert(partial.includes("Проверка оплат"));
assert(!partial.includes('aria-label="Показатели продаж"'),"Broken financial data must not become zero KPIs");
resourceStatus=403;
const denied=render(jsx.jsx(AdminOverview,{}));
assert(!denied.includes("Настройка главной")&&!denied.includes("Проверка оплат"),"Access denied hides all cached administrative sections");
const chart=render(jsx.jsx(TimeSeriesChart,{points:fixture.series.map(row=>({date:row.date,value:row.orders})),label:"Заказы"}));
assert(chart.includes('tabindex="0"')&&chart.includes("aria-describedby="));
const zero=render(jsx.jsx(TimeSeriesChart,{points:[{date:"2026-10-29",value:0}],label:"Пустой день"}));
assert(!zero.includes("NaN")&&!zero.includes("Infinity"));
console.log("PASS: strict dashboard range/currency/series/totals validation, 4 KPIs, queue links, independent failures, shared metrics/chart SSR, keyboard/table alternative and zero-day safety");
