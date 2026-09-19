import ProductEditor from "./ProductEditor";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductEditor params={params} />;
}
