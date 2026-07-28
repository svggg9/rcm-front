import { ProductTile } from "../../components/ProductTile/ProductTile";
import type { CatalogProduct } from "../../components/Catalog/catalogTypes";

import styles from "./BrandPage.module.css";

type Collection = {
  id: number;
  title: string;
  description: string | null;
  products: CatalogProduct[];
};

export function BrandCollections({ collections }: { collections: Collection[] }) {
  if (collections.length === 0) return null;

  return (
    <div className={styles.storefrontCollections}>
      {collections.map((collection) => (
        <section key={collection.id} className={styles.storefrontCollection}>
          <header className={styles.collectionHeader}>
            <h2>{collection.title}</h2>
            {collection.description ? <p>{collection.description}</p> : null}
          </header>
          <ul className={styles.collectionGrid}>
            {collection.products.slice(0, 4).map((product) => (
              <ProductTile
                key={product.id}
                product={{
                  id: product.id,
                  publicId: product.publicId,
                  title: product.title,
                  brand: product.brand,
                  brandSlug: product.brandSlug,
                  images: product.images,
                  minPrice: product.minPrice,
                }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
