export type WireBasketCandidateName = "wire-top" | "wire-front" | "plastic-top";

/** Reference-based sketches for comparison, not production icons. */
export function WireBasketCandidate({ name, size = 24 }: { name: WireBasketCandidateName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {name === "wire-top" && <>
        <rect x="3.5" y="2.5" width="17" height="19" rx="1.6" />
        <path d="M7 6h10v12H7zM4 3l3 3m13-3-3 3M4 21l3-3m13 3-3-3" />
        <path d="M10.3 3.1v17.8M13.7 3.1v17.8M4 9.8h16M4 14.2h16" strokeWidth=".85" />
      </>}
      {name === "wire-front" && <>
        <path d="M2 9h20l-1.6 9.1a1.6 1.6 0 0 1-1.6 1.4H5.2a1.6 1.6 0 0 1-1.6-1.4L2 9Z" />
        <path d="M7 9 11 3.3m6 5.7-4-5.7M10.7 3.3h2.6" />
        <path d="M6.2 9.3 7 19.2m3-9.9.3 9.9m3.4-9.9-.3 9.9m4.4-9.9-.8 9.9M3 13h18M3.6 16.4h16.8" strokeWidth=".85" />
      </>}
      {name === "plastic-top" && <>
        <rect x="2.5" y="5" width="19" height="14" rx="1.7" />
        <path d="M7 8h10v8H7zM3.2 5.8 7 8m13.8-2.2L17 8M3.2 18.2 7 16m13.8 2.2L17 16" />
        <path d="M9.5 10.5h.1m2.4 0h.1m2.4 0h.1M9.5 13.5h.1m2.4 0h.1m2.4 0h.1M5 10h.1m-.1 4h.1m13.8-4h.1m-.1 4h.1" strokeWidth="1.2" />
      </>}
    </svg>
  );
}
