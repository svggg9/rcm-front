import { SellerDashboardRoute, type SellerDashboardSearchParams } from "../SellerDashboardRoute";
export default function Page({ searchParams }: { searchParams?: Promise<SellerDashboardSearchParams> }) {
  return SellerDashboardRoute({ initialTab: "finance", searchParams });
}
