type Props = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  ariaHidden?: boolean;
};

/** Seller's legal and payment details. */
export function DetailsIcon({ size = 20, strokeWidth = 1.5, className, ariaHidden = true }: Props) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth * (2.8 / 1.5)} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden={ariaHidden} focusable="false">
    <path d="M16 8h25l7 7v40H16V8Z" />
    <path d="M41 8v8h7M23 24h18M23 32h18M23 40h12" />
  </svg>;
}
