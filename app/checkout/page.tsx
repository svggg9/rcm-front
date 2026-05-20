import { redirect } from "next/navigation";

import { CheckoutPageClient } from "./CheckoutPageClient";
import { getServerSession } from "../lib/session";

export default async function CheckoutPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login?next=/checkout");
  }

  return <CheckoutPageClient />;
}