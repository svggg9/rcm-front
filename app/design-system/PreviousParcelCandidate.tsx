/** Previous off-center ribbon retained for comparison. */
function PreviousParcelArtwork({ strokeWidth = 2.4 }: { strokeWidth?: number }) {
  return <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 8 54 19.5v26L32 57 10 45.5v-26L32 8Z" />
    <path d="M10 19.5 32 31l22-11.5M32 31v26" />
    <path d="M22 13.2 29 9.5 51 20.9v8l-7 3.6v-7.9L22 13.2Z" fill="var(--gold, #bfa26f)" />
  </g>;
}

export function PreviousParcelCandidate({ size = 64 }: { size?: number }) {
  return <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
    <PreviousParcelArtwork />
  </svg>;
}

/** The previous parcel inside the selected pickup-point silhouette. */
export function PreviousPickupCandidate({ size = 64 }: { size?: number }) {
  return <svg viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true" focusable="false">
    <path d="M32 58s-20-17.5-20-32a20 20 0 0 1 40 0c0 14.5-20 32-20 32Z"
      stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    <g transform="translate(17.45 12.36) scale(.455)"><PreviousParcelArtwork strokeWidth={5.28} /></g>
  </svg>;
}
