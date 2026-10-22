import Link from "next/link";
import styles from "./HomePage.module.css";
import { getHomePageData } from "./home/lib/getHomePageData";
import { getHomeCategories } from "./home/lib/getHomeCategories";
import { getStorefrontHome } from "./home/lib/getStorefrontHome";
import { buildHomeBlocks, homeCatalogHref } from "./home/lib/homePresentation";
import { ProductRailSection } from "./home/sections/ProductRailSection";
import { HomeRequestError } from "./home/sections/HomeRequestError";
import { CategoriesRefresh } from "./home/sections/CategoriesRefresh";
import { RecommendationsShowcase } from "./components/Recommendations/RecommendationsShowcase";
import { EmptyState } from "./components/ui/EmptyState";

type HomePageProps = { searchParams?: Promise<{ audience?: string }> };

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const audience = params?.audience === "men" || params?.audience === "women" ? params.audience : "all";
  const [storefront, catalog, categoryLinks] = await Promise.all([getStorefrontHome(), getHomePageData(audience), getHomeCategories(audience)]);
  const collections = storefront?.collections ?? [];
  const blocks = buildHomeBlocks(catalog.products, audience, collections);
  const shownIds = [...new Set(blocks.flatMap(block => block.products.map(product => product.id)))];
  const hasContent = shownIds.length > 0;
  const hasError = storefront === null || catalog.status === "error";

  return <div className={styles.page} data-home-page>
    <CategoriesRefresh />
    <h1 className="visuallyHidden">Товары и подборки рцмаркет</h1>
    <div className="pageContainer">
      <nav className={styles.categories} aria-label="Категории товаров">
        {categoryLinks.categories.map(category => <Link key={category.href} href={category.href}>
          {category.title}
        </Link>)}
        <Link href={homeCatalogHref(audience)}>Весь каталог</Link>
      </nav>
      <div className={styles.sections}>
        {categoryLinks.status === "error" ? <HomeRequestError partial message="Не удалось загрузить категории" /> : null}
        {hasError ? <HomeRequestError partial={hasContent} /> : null}
        {blocks.map(block => <ProductRailSection key={block.href} block={block} />)}
        {!hasContent && !hasError ? <EmptyState title="Новые товары скоро появятся"
          text="Загляните к нам чуть позже" /> : null}
        {catalog.status === "ready" && catalog.products.some(product => !shownIds.includes(product.id)) ?
          <RecommendationsShowcase audience={audience} excludeIds={shownIds} presentation="storefront" mobileLayout="grid" className={styles.recommendations} /> : null}
      </div>
      <section className={styles.serviceStrip} aria-label="О покупках">
        <div><strong>Доставка в ПВЗ</strong><span>Стоимость рассчитывается при оформлении</span></div>
        <div><strong>Помощь с заказом</strong><Link href="/contacts">Связаться с нами</Link></div>
      </section>
    </div>
  </div>;
}
