import { CabinetSkeleton } from "../components/ui/CabinetSkeleton";

export default function SellerLoading() {
  return <div className="pageContainer" data-seller-shell><CabinetSkeleton variant="dashboard" /></div>;
}
