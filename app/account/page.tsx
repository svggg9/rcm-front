import { redirect } from "next/navigation";

import { AccountPageClient } from "./AccountPageClient";
import { getServerSession } from "../lib/session";
import {
  getAccountMeServer,
  getAccountOrderServer,
  getAccountOrdersServer,
} from "./lib/accountServerApi";

type Props = {
  searchParams?: Promise<{
    tab?: string;
    orderId?: string;
  }>;
};

export default async function AccountPage({ searchParams: rawSearchParams }: Props) {
  const searchParams = await rawSearchParams;
  const initialOrderId = searchParams?.orderId ?? null;
  const parsedOrderId = initialOrderId ? Number(initialOrderId) : NaN;
  const shouldLoadOrders =
    searchParams?.tab === "orders";
  const shouldLoadOrder =
    searchParams?.tab === "orders" && Number.isFinite(parsedOrderId);

  const [session, initialMe, initialOrders, initialSelectedOrder] = await Promise.all([
    getServerSession(),
    getAccountMeServer(),
    shouldLoadOrders
      ? getAccountOrdersServer()
      : Promise.resolve({
          content: [],
          totalPages: 0,
          totalElements: 0,
          size: 20,
          number: 0,
        }),
    shouldLoadOrder
      ? getAccountOrderServer(parsedOrderId)
      : Promise.resolve(null),
  ]);

  if (!session) {
    const next = shouldLoadOrder ? `/account?tab=orders&orderId=${parsedOrderId}` : "/account";
    redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  }
  if (!initialMe) throw new Error("Не удалось загрузить профиль");

  return (
    <AccountPageClient
      initialMe={initialMe}
      initialOrders={initialOrders ?? { content: [], totalPages: 0, totalElements: 0, size: 20, number: 0 }}
      initialOrdersLoaded={shouldLoadOrders && initialOrders !== null}
      initialSelectedOrder={initialSelectedOrder}
    />
  );
}
