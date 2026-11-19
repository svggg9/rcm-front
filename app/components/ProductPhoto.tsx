"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { imageFrameTransform, productImageBounds } from "../lib/productImageFrame";
import { PhotoPlaceholder } from "./ui/PhotoPlaceholder";

/** Presentation only: original files and the full-size viewer are never cropped or rewritten. */
export function ProductPhoto({ src, alt, sizes, className, priority = false, normalizeWhitespace = false }: {
  src: string; alt: string; sizes: string; className?: string; priority?: boolean; normalizeWhitespace?: boolean;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [framing, setFraming] = useState<{ src: string; transform: string } | null>(null);
  const update = useCallback((image: HTMLImageElement) => {
    if (!normalizeWhitespace || !image.complete || !image.naturalWidth) return;
    const bounds = productImageBounds(image, src);
    if (!bounds) return;
    const transform = imageFrameTransform(bounds, image.naturalWidth, image.naturalHeight, image.clientWidth, image.clientHeight);
    setFraming(previous => previous?.src === src && previous.transform === transform ? previous : { src, transform });
  }, [normalizeWhitespace, src]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !normalizeWhitespace) return;
    const observer = new ResizeObserver(() => update(image));
    observer.observe(image);
    return () => observer.disconnect();
  }, [normalizeWhitespace, update]);

  if (failedSrc === src) return <PhotoPlaceholder label="Не удалось загрузить фото" />;

  return <Image ref={imageRef} src={src} alt={alt} fill sizes={sizes} priority={priority}
    className={className} onLoad={event => update(event.currentTarget)}
    onError={() => setFailedSrc(src)}
    style={normalizeWhitespace && framing?.src === src ? { transform: framing.transform, transformOrigin: "center" } : undefined} />;
}
