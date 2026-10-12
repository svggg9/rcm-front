import { CatalogPageContent } from "../components/Catalog/CatalogPageContent";
import type { CatalogSearchParams } from "../components/Catalog/catalogTypes";

export { generateMetadata } from "../components/Catalog/CatalogPageContent";

export default function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<CatalogSearchParams>;
}) {
  return <CatalogPageContent searchParams={searchParams} />;
}
