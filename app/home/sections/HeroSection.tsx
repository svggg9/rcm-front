import Link from "next/link";
import styles from "./HeroSection.module.css";
import { HeroBlock } from "../types";
import Image from "next/image";

type HeroSectionProps = {
  block: HeroBlock;
};

export function HeroSection({ block }: HeroSectionProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.media}>
        <Image
          fill
          src={block.image}
          alt={block.imageAlt}
          sizes="(max-width: 1100px) 100vw, 60vw"
          className={styles.image}
          priority
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