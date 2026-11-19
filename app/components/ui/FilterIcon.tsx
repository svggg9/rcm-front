type Props = { size?: number; strokeWidth?: number; className?: string; ariaHidden?: boolean };

export function FilterIcon({ size = 20, strokeWidth = 1.5, className, ariaHidden = true }: Props) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth * 2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden={ariaHidden} focusable="false">
    <path d="M10 14h44L37 34v16l-10 5V34L10 14Z" />
  </svg>;
}
