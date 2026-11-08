"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DesignSystemIcon } from "./DesignSystemIcon";
import styles from "./StorefrontSectionCard.module.css";

type Props = {
  title: string;
  coverImageUrl?: string | null;
  coverPositionX?: number;
  coverPositionY?: number;
  href?: string;
  sizes?: string;
  className?: string;
};

function focusPosition(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
}

export function StorefrontSectionCard({
  title,
  coverImageUrl,
  coverPositionX = 50,
  coverPositionY = 50,
  href,
  sizes = "(max-width: 640px) 46vw, (max-width: 900px) 45vw, 30vw",
  className = "",
}: Props) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = coverImageUrl?.trim() || null;
  const content = <>
    <div className={styles.cover}>
      {source && source !== failedSource ? <Image
        src={source}
        alt=""
        fill
        sizes={sizes}
        className={styles.image}
        style={{ objectPosition: `${focusPosition(coverPositionX)}% ${focusPosition(coverPositionY)}%` }}
        unoptimized={source.startsWith("blob:")}
        onError={() => setFailedSource(source)}
      /> : <span className={styles.placeholder} aria-hidden="true">
        <DesignSystemIcon name="images" role="empty" />
      </span>}
    </div>
    <span className={styles.title}>{title}</span>
  </>;
  const classes = `${styles.card} ${href ? styles.link : ""} ${className}`.trim();

  return href ? <Link href={href} className={classes}>{content}</Link> :
    <div className={classes}>{content}</div>;
}
