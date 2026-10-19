import Image from "next/image";

export function CdekLogo({ height = 24 }: { height?: number }) {
  return <Image src="/logos/cdek.svg" alt="СДЭК" width={Math.round(height * 631 / 142)} height={height}
    unoptimized style={{ display: "block", width: "auto", height, flexShrink: 0 }} />;
}
