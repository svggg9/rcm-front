"use client";

import Link from "next/link";

import { EmptyState } from "../../components/ui/EmptyState";
import { HeaderIcon } from "../../components/Header/HeaderIcon";

export function EmptyCart() {
  return (
      <EmptyState
        title="Ваша корзина пуста"
        illustration={<HeaderIcon name="bag" />}
        actions={
            <Link href="/catalog" className="buttonPrimary">
              В магазин
            </Link>
        }
      />
  );
}
