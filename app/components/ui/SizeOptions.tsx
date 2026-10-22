"use client";
import styles from "./SizeOptions.module.css";
import { sortProductSizes } from "../../lib/productPresentation";
export type SizeOption = { id: number; size: string; availableQuantity: number | null };
export function SizeOptions({ options, value, disabled = false, showHeading = true, onChange }: {
  options: SizeOption[]; value: number | null; disabled?: boolean; showHeading?: boolean; onChange: (id: number) => void;
}) {
  return <div className={styles.options} role="group" aria-label="Размер товара" onKeyDown={event => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault(); buttons[next]?.focus();
  }}>
    {showHeading && <div className={styles.heading}>Выберите размер</div>}
    <div className={styles.list}>{sortProductSizes(options).map(option => {
      const unavailable = option.availableQuantity !== null && option.availableQuantity <= 0;
      return <button key={option.id} type="button" className={styles.option} disabled={disabled || unavailable}
        aria-pressed={value === option.id} aria-label={`Размер: ${option.size || "Единый размер"}${unavailable ? ", нет в наличии" : ""}`}
        onClick={() => onChange(option.id)}>{option.size || "Единый размер"}</button>;
    })}</div>
  </div>;
}
