type Props = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  ariaHidden?: boolean;
};

export function ProfileIcon({ size = 24, strokeWidth = 1.35, className, ariaHidden = true }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={ariaHidden} focusable="false">
      <circle cx="12" cy="12" r="9.3" />
      <circle cx="12" cy="9" r="2.8" />
      <path d="M6.6 19.4v-.7c0-2.7 2.4-4.5 5.4-4.5s5.4 1.8 5.4 4.5v.7" />
    </svg>
  );
}

export function SearchIcon({ size = 24, strokeWidth = 1.4, className, ariaHidden = true }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={ariaHidden} focusable="false">
      <circle cx="10.5" cy="10.5" r="6.8" />
      <path d="m15.3 15.3 3.5 3.5" />
    </svg>
  );
}
