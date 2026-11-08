import Link from "next/link";
import { buildHomeNavigation, type HomeAudience } from "../lib/homePresentation";
import type { StorefrontHomeCollection } from "../lib/getStorefrontHome";
import styles from "../../HomePage.module.css";

export function StorefrontNavigation({ categories, collections, audience = "all", active }: {
  categories: { title: string; href: string }[];
  collections: StorefrontHomeCollection[];
  audience?: HomeAudience;
  active?: "gifts";
}) {
  return <nav className={styles.categories} aria-label="Разделы витрины">
    {buildHomeNavigation(categories, collections, audience).map(item => <Link key={item.href} href={item.href}
      aria-current={active === "gifts" && item.href.startsWith("/gifts") ? "page" : undefined}>
      {item.title}
    </Link>)}
  </nav>;
}
