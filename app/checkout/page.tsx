import { redirect } from "next/navigation";

import { CheckoutPageClient } from "./CheckoutPageClient";
import { getServerSession } from "../lib/session";
import {
  getCheckoutCartServer,
  getCheckoutProfileServer,
} from "./lib/checkoutServerApi";

export default async function CheckoutPage() {
  const [session, initialMe, initialCart] = await Promise.all([
    getServerSession(),
    getCheckoutProfileServer(),
    getCheckoutCartServer(),
  ]);

  if (!session) {
    redirect("/auth/login?next=/checkout");
  }

  return <CheckoutPageClient initialMe={initialMe} initialCart={initialCart} />;
}
