import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./BrandPage.module.css";

export function BrandPresentation({ name, wordmarkUrl, description, action, compact = false }: {
  name: string; wordmarkUrl?: string | null; description?: string | null; action?: ReactNode; compact?: boolean;
}) {
  return <div className={styles.catalogTop}>
    <div className={styles.headingWrap}>
      {wordmarkUrl ? <><h1 className="visuallyHidden">{name}</h1>
        <div className={styles.wordmark}><Image src={wordmarkUrl} alt={name} fill
          sizes="(max-width: 560px) 72vw, 520px" priority /></div></>
        : <h1 className={styles.heading}>{name}</h1>}
      {action}
    </div>
    {description ? <section className={styles.brandHero}><div className={styles.brandHeroMain}>
      <p className={`${styles.brandDescription} ${compact ? styles.shortDescription : ""}`}>{description}</p>
    </div></section> : null}
  </div>;
}
