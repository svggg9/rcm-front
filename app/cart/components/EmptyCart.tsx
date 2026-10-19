"use client";

import Link from "next/link";

import { EmptyState } from "../../components/ui/EmptyState";

export function EmptyCart() {
  return (
      <EmptyState
        title="Корзина пуста"
        actions={
            <Link href="/catalog" className="buttonPrimary">
              Перейти в каталог
            </Link>
        }
      />
  );
}
