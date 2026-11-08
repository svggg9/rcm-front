import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "../components/ui/EmptyState";
import { getHomeCategories } from "../home/lib/getHomeCategories";
import { getStorefrontHome } from "../home/lib/getStorefrontHome";
import { homeCatalogHref } from "../home/lib/homePresentation";
import { HomeRequestError } from "../home/sections/HomeRequestError";
import { StorefrontNavigation } from "../home/sections/StorefrontNavigation";
import styles from "../HomePage.module.css";

export const metadata: Metadata = { title: "Подарки — рцмаркет" };

type GiftsPageProps = { searchParams?: Promise<{ audience?: string }> };

export default async function GiftsPage({ searchParams }: GiftsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const audience = params?.audience === "men" || params?.audience === "women" ? params.audience : "all";
  const [storefront, categoryLinks] = await Promise.all([
    getStorefrontHome(),
    getHomeCategories(audience, true),
  ]);
  const gifts = storefront?.collections.find(collection =>
    collection.title.trim().toLocaleLowerCase("ru-RU") === "подарки" && collection.products.length > 0
  );

  if (gifts) redirect(homeCatalogHref(audience, { collection: String(gifts.id) }));

  return <div className={styles.page}>
    <div className="pageContainer">
      <StorefrontNavigation audience={audience} categories={categoryLinks.categories}
        collections={storefront?.collections ?? []} active="gifts" />
      <section className={styles.sections} aria-labelledby="gifts-title">
        <h1 className="sectionTitleLarge" id="gifts-title">Подарки</h1>
        {categoryLinks.status === "error" ? <HomeRequestError partial message="Не удалось загрузить категории" /> : null}
        {storefront === null ? <HomeRequestError partial={false} message="Не удалось загрузить подборку" /> :
          <EmptyState title="Подборка скоро появится" actions={
            <Link href={homeCatalogHref(audience)} className="buttonPrimary buttonLabel">Весь каталог</Link>
          } />}
      </section>
    </div>
  </div>;
}
