import Link from "next/link";
import { BrandWordmark } from "../../components/ui/BrandWordmark";
import { StorefrontSectionCard } from "../../components/ui/StorefrontSectionCard";
import type { HomeBrand } from "../lib/getHomeBrands";
import type { StorefrontHomeCollection } from "../lib/getStorefrontHome";
import { buildHomeNavigation, buildHomeSectionCards, type HomeAudience } from "../lib/homePresentation";
import type { StorefrontSection } from "../../lib/storefrontSections";
import { EmptyState } from "../../components/ui/EmptyState";
import { HomeRequestError } from "./HomeRequestError";
import { purchaseInformation } from "../../lib/purchaseInformation";
import styles from "../../HomePage.module.css";

export function HomeSections({ sections = [], categories, collections, audience, failed }: {
  sections?: StorefrontSection[]; categories: { title: string; href: string }[];
  collections: StorefrontHomeCollection[]; audience: HomeAudience; failed: boolean;
}) {
  const cards = buildHomeSectionCards(sections, audience);
  // Until covers are published, preserve useful links without inventing editorial imagery.
  const links = buildHomeNavigation(categories, collections, audience).filter(item => item.kind !== "catalog");
  return <section aria-labelledby="home-sections-title" data-home-sections>
    <h2 id="home-sections-title" className={styles.sectionTitle}>Разделы и подборки</h2>
    {failed ? <HomeRequestError partial message="Не удалось загрузить разделы и подборки" /> : cards.length ?
      <ul className={styles.sectionGrid}>{cards.map(card => <li key={card.id}>
        <StorefrontSectionCard title={card.title} coverImageUrl={card.coverImageUrl}
          coverPositionX={card.coverPositionX} coverPositionY={card.coverPositionY} href={card.href} />
      </li>)}</ul> :
      <ul className={styles.sectionLinks}>{links.map(link => <li key={link.href}><Link href={link.href}>{link.title}</Link></li>)}</ul>}
  </section>;
}

export function HomeBrands({ brands, failed }: { brands: HomeBrand[]; failed: boolean }) {
  return <section aria-labelledby="home-brands-title" data-home-brands>
    <h2 id="home-brands-title" className={styles.sectionTitle}>Бренды</h2>
    {failed ? <HomeRequestError partial message="Не удалось загрузить бренды" /> : brands.length ?
      <ul className={styles.brandGrid}>{brands.slice(0, 8).map(brand => <li key={brand.id}>
        <Link href={`/brand/${encodeURIComponent(brand.slug)}`} aria-label={brand.name}>
          <BrandWordmark src={brand.wordmarkUrl} name={brand.name} className={styles.brandWordmark} />
        </Link>
      </li>)}</ul> : <EmptyState title="Бренды скоро появятся" />}
  </section>;
}

export function HomeShoppingInformation() {
  return <section aria-labelledby="home-shopping-title" data-home-shopping>
    <h2 id="home-shopping-title" className={styles.sectionTitle}>О покупках</h2>
    <div className={styles.shoppingGrid}>
      <div><h3>Доставка</h3><p>{purchaseInformation.delivery}</p></div>
      <div><h3>Оплата</h3><p>{purchaseInformation.payment}</p></div>
      <div><h3>Возвраты</h3><p>Заявка на возврат доступна в личном кабинете</p><Link href="/account?tab=returns">Мои возвраты</Link></div>
      <div><h3>Поддержка</h3><p>Поможем с выбором и вопросами по заказу</p><Link href="/contacts">Связаться с нами</Link></div>
    </div>
  </section>;
}
