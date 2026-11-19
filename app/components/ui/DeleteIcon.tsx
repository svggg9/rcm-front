type Props = { size?: number; strokeWidth?: number; className?: string; ariaHidden?: boolean };

export function DeleteIcon({ size = 24, strokeWidth = 1.5, className, ariaHidden = true }: Props) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth * (2.8 / 1.5)} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden={ariaHidden} focusable="false">
    <path d="M14 17h36M25 17v-5h14v5M19 17l2 36h22l2-36" />
    <path d="M27 25v20M37 25v20" />
  </svg>;
}
