type Props = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  ariaHidden?: boolean;
};

// The chosen parcel contour, shared by the order icon and its design-system example.
export function OrderIcon({ size = 24, strokeWidth = 1.5, className, ariaHidden = true }: Props) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth * 1.6} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden={ariaHidden} focusable="false">
    <path d="M32 8 54 19.5v26L32 57 10 45.5v-26L32 8Z" />
    <path d="M10 19.5 32 31l22-11.5M32 31v26" />
    <path d="M17.5 15.6 24.5 11.9 46.5 23.4v8l-7 3.7v-8L17.5 15.6Z" fill="var(--gold, #bfa26f)" />
  </svg>;
}
