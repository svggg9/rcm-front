"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./BrandWordmark.module.css";

export function BrandWordmark({ src, name, className = "", sizes = "(max-width: 640px) 40vw, 200px", priority = false }: {
  src?: string | null; name: string; className?: string; sizes?: string; priority?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return <div className={`${styles.wordmark} ${className}`.trim()}>
    {src && failedSource !== src ? <Image src={src} alt={name} fill sizes={sizes} priority={priority}
      className={styles.image} onError={() => setFailedSource(src)} /> : <span className={styles.fallback}>{name}</span>}
  </div>;
}
