"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL, apiFetch } from "../../lib/api";
import { readApiError, toApiError } from "../../lib/apiErrors";
import { FormSelect } from "../../components/ui/FormSelect";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { RequestError } from "../../components/ui/RequestError";
import type { AdminProduct } from "../types";
import styles from "./AdminProductColors.module.css";

type Color = { id: number; name: string; hex?: string | null };
export function AdminProductColors({ product, disabled, onAssign }: {
  product: AdminProduct;
  disabled: boolean;
  onAssign: (groupId: number, colorId: number | null, expectedName: string | null) => Promise<void>;
}) {
  const [colors, setColors] = useState<Color[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<Record<number, number | "">>({});
  const [pending, setPending] = useState<number | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    void apiFetch(`${API_URL}/api/admin/products/colors`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) })
      .then(async response => { if (!response.ok) throw await readApiError(response, "Не удалось загрузить цвета"); return response.json() as Promise<Color[]>; })
      .then(data => { if (!controller.signal.aborted) setColors(data); })
      .catch(reason => { if (!controller.signal.aborted) setError(toApiError(reason, "Не удалось загрузить цвета").message); });
    return () => controller.abort();
  }, [attempt]);
  async function assign(group: NonNullable<AdminProduct["colorways"]>[number], value: number | "") {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setPending(group.id);
    setError(null);
    try { await onAssign(group.id, value || null, group.color); }
    catch (reason) { setError(toApiError(reason, "Не удалось присвоить цвет").message); }
    finally { inFlight.current = false; setPending(null); }
  }
  if (!product.colorways?.length) return null;
  return <div className={styles.section}>
    <h3>Цвета для фильтров</h3>
    <p>Сопоставьте оттенки продавца с базовыми цветами — названия, цены и фото оттенков сохранятся</p>
    {!colors && !error && <Loader inline label="Загрузка базовых цветов" />}
    {error && <RequestError variant="inline" message={error} onRetry={!colors ? () => setAttempt(value => value + 1) : undefined} />}
    {colors && product.colorways.map((group, index) => {
      const value = selection[group.id] ?? group.colorId ?? "";
      return <div className={styles.row} key={group.id}>
        <strong>{group.color || `Вариант ${index + 1}`}</strong>
        <FormSelect<number> label={`Базовый цвет: ${group.color || `вариант ${index + 1}`}`} value={value} disabled={disabled || pending !== null}
          options={[{ value: "", label: "Не назначен" }, ...colors.map(color => ({ value: color.id, label: color.name }))]} onChange={colorId => setSelection(current => ({ ...current, [group.id]: colorId }))} />
        <Button variant="secondary" loading={pending === group.id} disabled={disabled || pending !== null || value === (group.colorId ?? "")}
          onClick={() => void assign(group, value)}>Присвоить</Button>
      </div>;
    })}
  </div>;
}
