"use client";

import Link from "next/link";

import { EmptyState } from "../../components/ui/EmptyState";
import { HeaderIcon } from "../../components/Header/HeaderIcon";
import { GuestSignInPrompt } from "../../components/Auth/GuestSignInPrompt";

export function EmptyCart() {
  return (
      <EmptyState
        title="Ваша корзина пуста"
        illustration={<HeaderIcon name="bag" />}
        footer={<GuestSignInPrompt returnPath="/cart" />}
        actions={
            <Link href="/catalog" className="buttonPrimary">
              В каталог
            </Link>
        }
      />
  );
}
