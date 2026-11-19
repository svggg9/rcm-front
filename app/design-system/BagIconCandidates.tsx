import { CartIcon } from "../components/ui/CartIcon";

export type BagIconCandidateName = "bag-front" | "bag-fold" | "bag-soft" | "bag-tote";

/** Reference-inspired sketches for the design-system comparison. */
export function BagIconCandidate({ name, size = 24 }: { name: BagIconCandidateName; size?: number }) {
  if (name === "bag-front") return <CartIcon size={size} />;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === "bag-fold" && <>
        <path d="M5 3.5C5.1 2.6 5.8 2 6.7 2h1.5l.5 6h6.4l.4-4.5c.1-.9.8-1.5 1.7-1.5h1L21 18.4c.3 2-1.2 3.6-3.2 3.6H6.7c-2.1 0-3.7-1.7-3.5-3.7L5 3.5Z" />
        <path d="M17.4 2c-.6.2-.9.7-1 1.5l-1.1 14.8c-.2 2.2.9 3.7 2.5 3.7M16.1 8.5c1.1.5 2.2.4 3-.3M4.8 10l-.7 8.3c-.1.8 0 1.4.3 2" />
        <path d="M7 2c.8 0 1.2.5 1.3 1.4" />
      </>}
      {name === "bag-soft" && <>
        <path d="M5.2 3.8C5.4 2.6 6.1 2 7 2c.7 0 1.2.4 1.3 1.5l.5 4.6c2.1.2 4.2.3 6.3.2l.6-4.8c.1-1 .7-1.5 1.5-1.5 1 0 1.6.7 1.7 1.8l1.6 13.7c.2 2-1 3.3-2.7 4-1.2.5-2.7.5-4.3.2l-7-1.2c-1.9-.3-3-1.3-2.9-3.2L5.2 3.8Z" />
        <path d="M16.9 10.7c-.3 2.8-.4 5.7.2 8.2M18.8 13.1c-.1 1.5 0 3.2.3 4.7" />
      </>}
      {name === "bag-tote" && <>
        <path d="M2 10.5h20l-1.6 8.4c-.2 1.2-1.3 2.1-2.5 2.1H6.1c-1.2 0-2.3-.9-2.5-2.1L2 10.5Z" />
        <path d="m6.5 10.5 3-7.1c.3-.7 1.2-.7 1.5 0l2.6 7.1m-1.5-3.4 1.6-3.7c.3-.7 1.2-.7 1.5 0l2.6 7.1" />
        <path d="M6.5 12.4v5.4m11-5.4v5.4" />
      </>}
    </svg>
  );
}
