import { redirect } from "next/navigation";

import { CheckoutPageClient } from "./CheckoutPageClient";
import { getServerSession } from "../lib/session";
import {
  getCheckoutCartServer,
  getCheckoutProfileServer,
} from "./lib/checkoutServerApi";

export default async function CheckoutPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login?next=/checkout");
  }

  const [initialMe, initialCart] = await Promise.all([
    getCheckoutProfileServer(),
    getCheckoutCartServer(),
  ]);

  return <CheckoutPageClient initialMe={initialMe} initialCart={initialCart} />;
}
