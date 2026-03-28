import styles from "./HomePage.module.css";
import { HOME_HERO } from "./home/constants";
import { getHomePageData } from "./home/lib/getHomePageData";
import { HeroSection } from "./home/sections/HeroSection";
import { ProductShowcaseSection } from "./home/sections/ProductShowcaseSection";

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
      <HeroSection block={heroBlock} />

      <ProductShowcaseSection block={data.brandShowcase} />
      <ProductShowcaseSection block={data.categoryShowcase} />
      <ProductShowcaseSection block={data.latestShowcase} />
    </div>
  );
}