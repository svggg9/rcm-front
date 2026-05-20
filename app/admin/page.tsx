import { redirect } from "next/navigation";

import { getServerSession } from "../lib/session";
import { AdminPageClient } from "./AdminPageClient";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login?next=/admin");
  }

  if (session.role !== "ADMIN") {
    redirect("/");
  }

  return <AdminPageClient />;
}