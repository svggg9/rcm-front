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
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login?next=/account");
  }

  const searchParams = await rawSearchParams;
  const initialOrderId = searchParams?.orderId ?? null;
  const parsedOrderId = initialOrderId ? Number(initialOrderId) : NaN;
  const shouldLoadOrder =
    searchParams?.tab === "orders" && Number.isFinite(parsedOrderId);

  const [initialMe, initialOrders, initialSelectedOrder] = await Promise.all([
    getAccountMeServer(),
    getAccountOrdersServer(),
    shouldLoadOrder
      ? getAccountOrderServer(parsedOrderId)
      : Promise.resolve(null),
  ]);

  if (!initialMe) {
    redirect("/auth/login?next=/account");
  }

  return (
    <AccountPageClient
      initialMe={initialMe}
      initialOrders={initialOrders}
      initialSelectedOrder={initialSelectedOrder}
    />
  );
}
