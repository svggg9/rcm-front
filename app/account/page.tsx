import { redirect } from "next/navigation";

import { AccountPageClient } from "./AccountPageClient";
import { getServerSession } from "../lib/session";
import {
  getAccountMeServer,
  getAccountOrdersServer,
} from "./lib/accountServerApi";

export default async function AccountPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login?next=/account");
  }

  const [initialMe, initialOrders] = await Promise.all([
    getAccountMeServer(),
    getAccountOrdersServer(),
  ]);

  if (!initialMe) {
    redirect("/auth/login?next=/account");
  }

  return (
    <AccountPageClient
      initialMe={initialMe}
      initialOrders={initialOrders}
    />
  );
}