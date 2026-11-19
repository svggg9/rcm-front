export type CartIconCandidateName = "previous" | "soft" | "handles" | "basket" | "bag";

/** Comparison sketches only; the selected production icon remains CartIcon. */
export function CartIconCandidate({ name, size = 24 }: { name: CartIconCandidateName; size?: number }) {
  if (name === "previous") return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M2.5 8h19l-1.75 10.1a2 2 0 0 1-1.97 1.65H6.22a2 2 0 0 1-1.97-1.65L2.5 8Z" />
      <path d="M8.5 8V5.75a3.5 3.5 0 0 1 7 0V8" />
    </svg>
  );

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {name === "soft" && <>
        <path d="M3 8h18l-1.45 9.65a2.5 2.5 0 0 1-2.47 2.13H6.92a2.5 2.5 0 0 1-2.47-2.13L3 8Z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </>}
      {name === "handles" && <>
        <path d="M3 9h18l-1.55 9.2a2 2 0 0 1-1.97 1.67H6.52a2 2 0 0 1-1.97-1.67L3 9Z" />
        <path d="m7 9 3-5.5M17 9l-3-5.5" />
        <path d="M9 13v3.5m3-3.5v3.5m3-3.5v3.5" />
      </>}
      {name === "basket" && <>
        <path d="M3 9.5h18l-1.8 8.7a2 2 0 0 1-1.96 1.6H6.76a2 2 0 0 1-1.96-1.6L3 9.5Z" />
        <path d="M2.5 9.5h19M7.5 9.5 10 4m6.5 5.5L14 4" />
        <path d="m8.5 13 .5 3m3-3v3m3.5-3-.5 3" />
      </>}
      {name === "bag" && <>
        <path d="M5.5 7.5h13l1 12h-15l1-12Z" />
        <path d="M8.5 9V6.8a3.5 3.5 0 0 1 7 0V9" />
      </>}
    </svg>
  );
}
