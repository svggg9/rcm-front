import { notFound, redirect } from "next/navigation";

import { API_URL } from "../../../../lib/config";
import { getServerSession } from "../../../../lib/session";
import {
  getSellerAccessAndBrandsServer,
  getSellerProductDetailsServer,
} from "../../../lib/sellerServerApi";
import { ProductEditPageClient } from "./ProductEditPageClient";
import type { Option, SellerProduct } from "./types";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductEditPage({ params }: Props) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    return (
      <div className="pageContainer">
        <div>Некорректный ID товара</div>
      </div>
    );
  }

  const [accessAndBrands, productResult, categories] = await Promise.all([
    getSellerAccessAndBrandsServer(),
    getSellerProductDetailsServer<SellerProduct>(productId),
    getProductEditorCategories(),
  ]);

  if (accessAndBrands.status === 401 || accessAndBrands.status === 403) {
    const session = await getServerSession();

    if (!session) {
      redirect(`/auth/login?next=/seller/products/${productId}/edit`);
    }

    redirect("/");
  }

  if (accessAndBrands.status >= 400) {
    throw new Error("Не удалось загрузить данные магазина");
  }

  if (!productResult.product) {
    if (productResult.status === 404) notFound();
    throw new Error("Не удалось загрузить товар");
  }

  const sellerBrands: Option[] = accessAndBrands.brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
  }));
  return (
    <ProductEditPageClient
      key={productId}
      productId={productId}
      initialProduct={productResult.product}
      initialCategories={categories}
      initialBrands={sellerBrands}
    />
  );
}

async function getProductEditorCategories(): Promise<Option[]> {
  try {
    const response = await fetch(`${API_URL}/api/catalog/categories`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) return [];

    const data: unknown = await response.json();

    return Array.isArray(data)
      ? data.filter(
          (item): item is Option =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as Option).id === "number" &&
            typeof (item as Option).name === "string"
        )
      : [];
  } catch {
    return [];
  }
}
