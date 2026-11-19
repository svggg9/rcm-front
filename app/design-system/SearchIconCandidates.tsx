import { SearchIcon } from "../components/ui/NavigationIcons";

export type SearchIconCandidateName = "classic" | "large-lens" | "upright" | "short-handle";

/** Contour sketches for comparison in the design system. */
export function SearchIconCandidate({ name, size = 24 }: { name: SearchIconCandidateName; size?: number }) {
  if (name === "short-handle") return <SearchIcon size={size} />;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {name === "classic" && <>
        <circle cx="10" cy="10" r="6.5" />
        <path d="m14.7 14.7 5.5 5.5" />
      </>}
      {name === "large-lens" && <>
        <circle cx="10.2" cy="10.2" r="7.2" />
        <path d="m15.3 15.3 4.7 4.7" />
      </>}
      {name === "upright" && <>
        <circle cx="10.5" cy="9.5" r="6.5" />
        <path d="m14.4 14.7 3.8 6.1" />
      </>}
    </svg>
  );
}

