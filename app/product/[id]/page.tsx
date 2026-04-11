import { API_URL } from "../../lib/api";
import ProductPageClient from "./ProductPageClient";
import type { Product } from "./lib/types";
import { getRelatedProducts } from "./lib/productPageUtils";

async function getProduct(id: string): Promise<Product | null> {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_URL}/api/products`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return [];
  }

  const data: Product[] = await response.json();
  return Array.isArray(data) ? data : [];
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await getProduct(id);

  if (!product) {
    return <div className="pageContainer">Товар не найден</div>;
  }

  const products = await getProducts();
  const related = getRelatedProducts(products, product, 12);

  return <ProductPageClient product={product} related={related} />;
}