import styles from "./HomePage.module.css";
import { getHomePageData } from "./home/lib/getHomePageData";
import { getHomeCategories } from "./home/lib/getHomeCategories";
import { getStorefrontHome } from "./home/lib/getStorefrontHome";
import { homeCatalogHref, normalizeHomeProducts } from "./home/lib/homePresentation";
import { normalizeNewArrivalsCount } from "./lib/storefrontSettings";
import { getHomeBrands } from "./home/lib/getHomeBrands";
import { ProductRailSection } from "./home/sections/ProductRailSection";
import { HomeRequestError } from "./home/sections/HomeRequestError";
import { CategoriesRefresh } from "./home/sections/CategoriesRefresh";
import { StorefrontNavigation } from "./home/sections/StorefrontNavigation";
import { HomeBrands, HomeSections, HomeShoppingInformation } from "./home/sections/HomeDiscovery";
import { EmptyState } from "./components/ui/EmptyState";

type HomePageProps = { searchParams?: Promise<{ audience?: string }> };

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const audience = params?.audience === "men" || params?.audience === "women" ? params.audience : "all";
  const storefrontRequest = getStorefrontHome();
  const [storefront, catalog, categoryLinks, brandResult] = await Promise.all([
    storefrontRequest, storefrontRequest.then(settings => getHomePageData(audience, settings?.newArrivalsCount)), getHomeCategories(audience, true), getHomeBrands(),
  ]);
  const collections = storefront?.collections ?? [];
  const selectedCollection = collections.find(collection => collection.id === storefront?.newArrivalsCollectionId);
  const newArrivals = (selectedCollection ? normalizeHomeProducts(selectedCollection.products, audience) : catalog.products).slice(0, normalizeNewArrivalsCount(storefront?.newArrivalsCount));
  const newArrivalsFailed = storefront === null || (!selectedCollection && catalog.status === "error");
  const newArrivalsHref = homeCatalogHref(audience, selectedCollection ? { collection: String(selectedCollection.id) } : { sort: "newest" });

  return <div className={styles.page} data-home-page>
    <CategoriesRefresh />
    <h1 className="visuallyHidden">Товары и подборки рцмаркет</h1>
    <div className="pageContainer">
      <StorefrontNavigation categories={categoryLinks.categories} collections={collections} audience={audience} />
      <div className={styles.sections}>
        {categoryLinks.status === "error" ? <HomeRequestError partial message="Не удалось загрузить категории" /> : null}
        {newArrivalsFailed ? <HomeRequestError partial message="Не удалось загрузить новинки" /> :
          newArrivals.length ? <ProductRailSection block={{ title: "Новое на рцмаркет", products: newArrivals,
            href: newArrivalsHref }} /> :
            <EmptyState title="Новые товары скоро появятся" text="Загляните к нам чуть позже" />}
        <HomeSections sections={storefront?.sections} categories={categoryLinks.categories}
          collections={collections} audience={audience} failed={storefront === null} />
        <HomeBrands brands={brandResult.brands} failed={brandResult.status === "error"} />
        <HomeShoppingInformation />
      </div>
    </div>
  </div>;
}
