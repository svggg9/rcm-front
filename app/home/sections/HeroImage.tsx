"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK_IMAGE = "/kazansky.jpg";

type HeroImageProps = {
  src: string;
  alt: string;
  className?: string;
  positionX?: number;
  positionY?: number;
};

export function HeroImage({
  src,
  alt,
  className,
  positionX = 50,
  positionY = 50,
}: HeroImageProps) {
  const normalizedSrc = src.trim() || FALLBACK_IMAGE;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const currentSrc = failedSrc === normalizedSrc ? FALLBACK_IMAGE : normalizedSrc;

  return (
    <Image
      fill
      src={currentSrc}
      alt={alt}
      sizes="100vw"
      className={className}
      style={{ objectPosition: `${positionX}% ${positionY}%` }}
      priority
      onError={() => {
        if (currentSrc !== FALLBACK_IMAGE) setFailedSrc(normalizedSrc);
      }}
    />
  );
}
