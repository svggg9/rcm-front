type Props = { size?: number; strokeWidth?: number; className?: string; ariaHidden?: boolean };

export function DeliveryTruckIcon({ size = 24, strokeWidth = 1.5, className, ariaHidden = true }: Props) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth * 1.6} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden={ariaHidden} focusable="false">
    <path d="M7 45V14h31v31H17M38 24h10l9 10v11h-5m-14 0h4" />
    <path d="M43 24v11h14" />
    <circle cx="12" cy="45" r="5" />
    <circle cx="47" cy="45" r="5" />
  </svg>;
}
