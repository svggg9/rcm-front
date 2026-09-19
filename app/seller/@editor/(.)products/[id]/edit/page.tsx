import ProductEditPage from "../../../../products/[id]/edit/ProductEditor";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductEditPage params={params} intercepted />;
}
