import { SectionLoader } from "./SectionLoader";

export type CabinetSkeletonVariant = "dashboard" | "list" | "detail" | "form" | "grid";
type SkeletonProps = { variant?: CabinetSkeletonVariant; rows?: number; compact?: boolean };
type PageSkeletonProps = SkeletonProps & { showPageHeader?: boolean; narrowSidebar?: boolean };

// Keep existing callers compatible while all section loading uses the same indicator.
export function CabinetSkeleton({ compact = false }: SkeletonProps) {
  return <SectionLoader compact={compact} />;
}

export function CabinetPageSkeleton({ compact = false }: PageSkeletonProps) {
  return <div className="pageContainer"><SectionLoader compact={compact} fullPage /></div>;
}
