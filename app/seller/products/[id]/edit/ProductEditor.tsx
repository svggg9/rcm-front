import { notFound, redirect } from "next/navigation";

import { API_URL } from "../../../../lib/config";
import { getServerSession } from "../../../../lib/session";
import {
  getSellerAccessAndBrandsServer,
  getSellerProductDetailsServer,
} from "../../../lib/sellerServerApi";
import { ProductEditPageClient } from "./ProductEditPageClient";
import type { Option, SellerProduct } from "./types";
import { normalizeCategories, type CategoryOption } from "../../../../lib/categories";

type Props = {
  intercepted?: boolean;
  presentation?: "dialog" | "page";
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductEditor({ params, intercepted = false, presentation = "dialog" }: Props) {
  const { id } = await params;
  const productId = Number(id);

  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(productId)) {
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
      redirect(`/auth/login?next=/seller/products/${productId}/${presentation === "page" ? "create" : "edit"}`);
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

  if (productResult.product.status === "DELETED" && !productResult.product.revisionSourceId) notFound();
  if (presentation === "page" && productResult.product.status !== "DRAFT") redirect(`/seller/products/${productId}/edit`);

  const sellerBrands: Option[] = accessAndBrands.brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
  }));
  const editor = (
    <ProductEditPageClient
      intercepted={intercepted}
      presentation={presentation}
      key={productId}
      productId={productId}
      initialProduct={productResult.product}
      initialCategories={categories.items}
      initialCategoryError={categories.error}
      initialBrands={sellerBrands}
    />
  );
  return presentation === "page" ? <div className="pageContainer" data-seller-shell>{editor}</div> : editor;
}

async function getProductEditorCategories(): Promise<{items: CategoryOption[]; error: boolean}> {
  try {
    const response = await fetch(`${API_URL}/api/catalog/categories`, {
      cache: "no-store", signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error("Category dictionary unavailable");

    const data: unknown = await response.json();

    return {items: normalizeCategories(data), error: false};
  } catch {
    return {items: [], error: true};
  }
}
