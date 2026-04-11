import styles from "./HomePage.module.css";
import { HOME_HERO } from "./home/constants";
import { getHomePageData } from "./home/lib/getHomePageData";
import { HeroSection } from "./home/sections/HeroSection";
import { ProductRailSection } from "./home/sections/ProductRailSection";

type HomePageProps = {
  searchParams?: Promise<{
    audience?: string;
  }>;
};

function normalizeAudience(value?: string): "men" | "women" | "all" {
  if (value === "men" || value === "women") return value;
  return "all";
}

function buildCatalogHref(audience: "men" | "women" | "all") {
  if (audience === "all") return "/catalog";
  return `/catalog?audience=${encodeURIComponent(audience)}`;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const audience = normalizeAudience(params?.audience);

  const data = await getHomePageData(audience);

  const heroBlock = {
    ...HOME_HERO,
    buttonHref: buildCatalogHref(audience),
  };

  return (
    <div className={styles.page}>
      <div className="pageContainer">
        <HeroSection block={heroBlock} />

        <ProductRailSection block={data.brandShowcase} />
        <ProductRailSection block={data.categoryShowcase} />
        <ProductRailSection block={data.latestShowcase} />
      </div>
    </div>
  );
}