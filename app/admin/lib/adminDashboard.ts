export type DashboardPeriod = "1" | "7" | "30";
export const DASHBOARD_PERIODS = [{ value: "1", label: "Сегодня" }, { value: "7", label: "7 дней" }, { value: "30", label: "30 дней" }] as const;
export function dashboardPeriod(value: string | null): DashboardPeriod { return value === "1" || value === "30" ? value : "7"; }
export type DashboardDay = { date: string; orders: number; turnover: number; refunds: number };
export type AdminDashboard = {
  period: number; from: string; to: string; timezone: string; currency: string; generatedAt: string;
  totals: { orders: number; turnover: number; averageOrder: number; refunds: number; estimatedOrderDates: number; estimatedRefundDates: number };
  series: DashboardDay[];
};
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const money = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER / 100;
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;

export function isAdminDashboard(value: unknown, expectedPeriod: string): value is AdminDashboard {
  if (!record(value) || value.period !== Number(expectedPeriod) || ![1,7,30].includes(value.period as number) || !date(value.from) || !date(value.to)
    || value.timezone !== "Europe/Moscow" || value.currency !== "RUB" || typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))
    || !record(value.totals) || !count(value.totals.orders) || !count(value.totals.estimatedOrderDates) || !count(value.totals.estimatedRefundDates)
    || ![value.totals.turnover,value.totals.averageOrder,value.totals.refunds].every(money) || !Array.isArray(value.series) || value.series.length !== value.period) return false;
  let orders = 0, turnover = 0, refunds = 0;
  for (let i = 0; i < value.series.length; i++) {
    const row = value.series[i];
    const expectedDate = new Date(Date.parse(value.from) + i * 86400000).toISOString().slice(0,10);
    if (!record(row) || row.date !== expectedDate || !count(row.orders) || !money(row.turnover) || !money(row.refunds)) return false;
    orders += row.orders; turnover += Math.round(row.turnover * 100); refunds += Math.round(row.refunds * 100);
  }
  return value.series.at(-1)?.date === value.to && orders === value.totals.orders && turnover === Math.round((value.totals.turnover as number) * 100)
    && refunds === Math.round((value.totals.refunds as number) * 100)
    && Math.round((value.totals.averageOrder as number) * 100) === (orders === 0 ? 0 : Math.round(turnover / orders))
    && value.totals.estimatedOrderDates <= orders;
}
