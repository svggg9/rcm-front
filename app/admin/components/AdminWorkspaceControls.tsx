"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { RequestError } from "../../components/ui/RequestError";
import styles from "./AdminWorkspace.module.css";

export function useAdminNavigation() {
  const params = useSearchParams();
  return (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    window.history.pushState(null, "", `/admin?${next}`);
  };
}

export function AdminPageControls({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (page: number) => void }) {
  return <div className={styles.pagination}>
    <span className={styles.hint}>Найдено {total}{totalPages > 1 ? ` | ${page + 1} из ${totalPages}` : ""}</span>
    {totalPages > 1 && <div className={styles.filters}>
      <Button variant="secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>Назад</Button>
      <Button variant="secondary" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Далее</Button>
    </div>}
  </div>;
}

export function AdminResourceState({ loading, error, empty, onRetry, hasData = false }: { loading: boolean; error?: string; empty?: boolean; onRetry: () => void; hasData?: boolean }) {
  if (error) return <RequestError variant={hasData ? "inline" : "section"} message={error}
    text={hasData ? "Показаны ранее загруженные данные" : undefined} onRetry={onRetry} loading={loading} />;
  if (loading && !hasData) return <CabinetSkeleton variant="list" compact rows={3} />;
  if (loading) return null;
  if (empty) return <EmptyState icon="search" title="Ничего не найдено" text="Попробуйте изменить поиск или фильтры" />;
  return null;
}

export function adminPageNumber(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 0 ? page : 0;
}
