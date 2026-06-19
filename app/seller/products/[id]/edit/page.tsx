import { redirect } from "next/navigation";

import { getServerSession } from "../../../../lib/session";
import {
  getSellerBrandsServer,
  getSellerOrdersServer,
  getSellerProductsServer,
} from "../../../lib/sellerServerApi";
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

  const [sellerBrands, sellerProducts, sellerOrders] = await Promise.all([
    getSellerBrandsServer(),
    getSellerProductsServer(),
    getSellerOrdersServer(),
  ]);

  const storeName = sellerBrands[0]?.name?.trim() || null;
  const activeProductsCount = sellerProducts.filter((product) => product.status === "ACTIVE").length;
  const activeOrdersCount = sellerOrders.filter((order) => order.status === "NEW").length;

  return (
    <ProductEditPageClient
      productId={productId}
      initialStoreName={storeName}
      initialProductsCount={activeProductsCount}
      initialOrdersCount={activeOrdersCount}
    />
  );
}
