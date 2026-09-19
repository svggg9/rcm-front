type Props = { direction?: "asc" | "desc" | null };

export function SortIndicator({ direction = null }: Props) {
  return (
    <svg width="14" height="16" viewBox="0 0 16 16" fill="currentColor"
      aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
      {direction === "asc" ? <path d="M8 3 14 12 2 12Z" />
        : direction === "desc" ? <path d="M2 4 14 4 8 13Z" />
        : <><path d="M8 1 12 7 4 7Z" /><path d="M4 9 12 9 8 15Z" /></>}
    </svg>
  );
}
