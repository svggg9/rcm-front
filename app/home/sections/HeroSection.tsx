import Link from "next/link";
import styles from "./HeroSection.module.css";
import { HeroBlock } from "../types";
import { HeroImage } from "./HeroImage";

type HeroSectionProps = {
  block: HeroBlock;
};

export function HeroSection({ block }: HeroSectionProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.imageWrap}>
        <HeroImage
          src={block.image}
          alt={block.imageAlt}
          className={styles.image}
          positionX={block.imagePositionX}
          positionY={block.imagePositionY}
        />
      </div>

      <div className={styles.content}>
        {block.eyebrow ? (
          <span className={styles.eyebrow}>{block.eyebrow}</span>
        ) : null}
        <h1 className={styles.title}>{block.title}</h1>
        {block.text ? <p className={styles.text}>{block.text}</p> : null}

        <div className={styles.actions}>
          <Link href={block.buttonHref} className={styles.button}>
            {block.buttonLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
