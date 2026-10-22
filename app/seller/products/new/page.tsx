import ProductEditor from "../[id]/edit/ProductEditor";

export default function Page() {
  return <ProductEditor params={Promise.resolve({ id: "new" })} presentation="page" />;
}
