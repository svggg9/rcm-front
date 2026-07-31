import styles from "./HomePage.module.css";
import { HOME_HERO } from "./home/constants";
import { getHomePageData } from "./home/lib/getHomePageData";
import {
  getStorefrontHome,
  getVersionedHeroImageUrl,
} from "./home/lib/getStorefrontHome";
import { HeroSection } from "./home/sections/HeroSection";
import { ProductRailSection } from "./home/sections/ProductRailSection";
import type { ProductShowcaseData } from "./home/types";

type HomePageProps = {
  searchParams?: Promise<{
    audience?: string;
  }>;
};

function normalizeAudience(value?: string): "men" | "women" | "all" {
  if (value === "men" || value === "women") return value;
  return "all";
}

function buildCatalogHref(
  audience: "men" | "women" | "all",
  collectionId?: number
) {
  const search = new URLSearchParams();
  if (audience !== "all") search.set("audience", audience);
  if (collectionId !== undefined) search.set("collection", String(collectionId));
  const query = search.toString();
  return query ? `/catalog?${query}` : "/catalog";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const audience = normalizeAudience(params?.audience);

  const [data, storefrontHome] = await Promise.all([
    getHomePageData(audience),
    getStorefrontHome(),
  ]);

  const heroBlock = {
    ...HOME_HERO,
    buttonHref: buildCatalogHref(audience),
    image: getVersionedHeroImageUrl(storefrontHome) ?? HOME_HERO.image,
    imagePositionX: storefrontHome?.heroPositionX ?? 50,
    imagePositionY: storefrontHome?.heroPositionY ?? 50,
  };
  const managedBlocks: ProductShowcaseData[] = (storefrontHome?.collections ?? [])
    .map((collection) => ({
      title: collection.title,
      href: buildCatalogHref(audience, collection.id),
      products: collection.products
        .filter((product) =>
          audience === "all" ||
          product.audience === "UNISEX" ||
          (audience === "men" && product.audience === "MEN") ||
          (audience === "women" && product.audience === "WOMEN")
        )
        .map((product) => ({
          id: product.id,
          publicId: product.publicId,
          title: product.title,
          brand: product.brand,
          category: product.category,
          audience: product.audience,
          minPrice: product.minPrice,
          images: [product.coverImage, product.hoverImage].filter(
            (image): image is string => Boolean(image)
          ),
        })),
    }))
    .filter((collection) => collection.products.length > 0);
  const productBlocks = managedBlocks.length > 0
    ? managedBlocks
    : [data.brandShowcase, data.categoryShowcase, data.latestShowcase];

  return (
    <div className={styles.page}>
      <div className="pageContainer">
        <HeroSection block={heroBlock} />

        <ProductRailSection block={productBlocks[0]} />

        {productBlocks.slice(1).map((block, index) => (
          <ProductRailSection key={`${block.title}-${index}`} block={block} />
        ))}

        <section className={styles.serviceStrip} aria-label="Преимущества магазина">
          <div>
            <strong>Оригинальные товары</strong>
            <span>Напрямую от российских марок</span>
          </div>
          <div>
            <strong>Единая доставка</strong>
            <span>Удобное оформление заказа</span>
          </div>
          <div>
            <strong>Поддержка</strong>
            <span>Поможем с заказом и возвратом</span>
          </div>
        </section>
      </div>
    </div>
  );
}
