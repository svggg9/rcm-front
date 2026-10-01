import { sellerEntityRoute } from "../../lib/sellerEntityRoute";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return sellerEntityRoute(params, "returns");
}
