import ProductEditor from "../edit/ProductEditor";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductEditor params={params} presentation="page" />;
}
