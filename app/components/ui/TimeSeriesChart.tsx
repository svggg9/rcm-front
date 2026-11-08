"use client";

import { useId, useState } from "react";
import styles from "./TimeSeriesChart.module.css";

export type TimeSeriesPoint = { date: string; value: number };
const dateLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });

export function TimeSeriesChart({ points, label, formatValue = String }: {
  points: TimeSeriesPoint[]; label: string; formatValue?: (value: number) => string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const descriptionId = useId();
  if (!points.length) return <p className="textHint">Нет данных за выбранный период</p>;
  const index = Math.min(selected ?? points.length - 1, points.length - 1);
  const active = points[index];
  const maximum = Math.max(1, ...points.map(point => point.value));
  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  const top = Math.ceil(maximum / (2 * magnitude)) * 2 * magnitude;
  const x = (i: number) => points.length === 1 ? 500 : 10 + i / (points.length - 1) * 980;
  const y = (value: number) => 210 - value / top * 190;
  const line = points.map((point, i) => `${i ? "L" : "M"}${x(i)},${y(point.value)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},210 L${x(0)},210 Z`;
  const move = (next: number) => setSelected(Math.max(0, Math.min(points.length - 1, next)));

  return <figure className={styles.chart}>
    <figcaption className={styles.caption} id={descriptionId} aria-live="polite"><span>{dateLabel(active.date)}</span><strong>{formatValue(active.value)}</strong></figcaption>
    <div className={styles.plot}>
      <div className={styles.axis} aria-hidden="true"><span>{formatValue(top)}</span><span>{formatValue(top / 2)}</span><span>0</span></div>
      <svg className={styles.svg} viewBox="0 0 1000 224" preserveAspectRatio="none" role="img" tabIndex={0}
        aria-label={`${label}. Стрелки влево и вправо выбирают день`} aria-describedby={descriptionId}
        onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(); move(Math.round(((event.clientX - rect.left) / rect.width * 1000 - 10) / 980 * (points.length - 1))); }}
        onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          move(event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : index + (event.key === "ArrowLeft" ? -1 : 1));
        }}>
        {[20, 115, 210].map(value => <line key={value} x1="0" x2="1000" y1={value} y2={value} className={styles.gridLine} />)}
        <path d={area} className={styles.area} />
        <path d={line} className={styles.line} />
        <line x1={x(index)} x2={x(index)} y1="20" y2="210" className={styles.guide} />
        <circle cx={x(index)} cy={y(active.value)} r="4" className={styles.point} />
      </svg>
    </div>
    <div className={styles.dates} aria-hidden="true"><span>{dateLabel(points[0].date)}</span>{points.length > 2 && <span>{dateLabel(points[Math.floor(points.length / 2)].date)}</span>}<span>{points.length > 1 ? dateLabel(points.at(-1)!.date) : ""}</span></div>
    <details className={styles.details}><summary>Данные по дням</summary><div className={styles.tableScroll}><table><thead><tr><th>Дата</th><th>{label}</th></tr></thead><tbody>{points.map(point => <tr key={point.date}><td>{dateLabel(point.date)}</td><td>{formatValue(point.value)}</td></tr>)}</tbody></table></div></details>
  </figure>;
}
