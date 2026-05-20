import { redirect } from "next/navigation";

import { getServerSession } from "../../../../lib/session";
import { ProductEditPageClient } from "./ProductEditPageClient";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductEditPage({ params }: Props) {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login?next=/seller/products");
  }

  if (session.role !== "SELLER" && session.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    return (
      <div className="pageContainer">
        <div>Некорректный ID товара</div>
      </div>
    );
  }

  return <ProductEditPageClient productId={productId} />;
}