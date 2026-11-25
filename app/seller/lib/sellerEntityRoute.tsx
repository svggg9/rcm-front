import { notFound, redirect } from "next/navigation";
import { getServerSession } from "../../lib/session";
import { sellerDeniedPath, sellerLoginPath } from "../../lib/partnerSso";
import { SellerEntityPage } from "../components/SellerEntityPage";

export async function sellerEntityRoute(params: Promise<{ id: string }>, kind: "orders" | "returns", intercepted = false) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const session = await getServerSession();
  if (!session) redirect(sellerLoginPath(`/seller/${kind}/${id}`));
  if (!["SELLER", "ADMIN", "ROLE_SELLER", "ROLE_ADMIN"].includes(session.role ?? "")) redirect(sellerDeniedPath());
  return <SellerEntityPage key={`${kind}-${id}`} id={Number(id)} kind={kind} intercepted={intercepted} />;
}
