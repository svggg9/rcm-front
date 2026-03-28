import Link from "next/link";
import styles from "./HeroSection.module.css";
import { HeroBlock } from "../types";

type HeroSectionProps = {
  block: HeroBlock;
};

export function HeroSection({ block }: HeroSectionProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.media}>
        <img
          src={block.image}
          alt={block.imageAlt}
          className={styles.image}
        />
      </div>

      <div className={styles.content}>
        <span className={styles.eyebrow}>{block.eyebrow}</span>
        <h1 className={styles.title}>{block.title}</h1>
        <p className={styles.text}>{block.text}</p>

        <div className={styles.actions}>
          <Link href={block.buttonHref} className={styles.button}>
            {block.buttonLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}