import { notFound, redirect } from "next/navigation";
import { getServerSession } from "../../lib/session";
import { SellerEntityPage } from "../components/SellerEntityPage";

export async function sellerEntityRoute(params: Promise<{ id: string }>, kind: "orders" | "returns", intercepted = false) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const session = await getServerSession();
  if (!session) redirect(`/auth/login?next=/seller/${kind}/${id}`);
  if (!["SELLER", "ADMIN", "ROLE_SELLER", "ROLE_ADMIN"].includes(session.role ?? "")) redirect("/");
  return <SellerEntityPage key={`${kind}-${id}`} id={Number(id)} kind={kind} intercepted={intercepted} />;
}
