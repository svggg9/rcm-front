import { ProductEditPageClient } from "./ProductEditPageClient";

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

  return <ProductEditPageClient productId={productId} />;
}