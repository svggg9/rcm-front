import { OrderIcon } from "./OrderIcon";

type Props = { size?: number; strokeWidth?: number; className?: string; ariaHidden?: boolean };

export function PickupPointIcon({ size = 24, strokeWidth = 1.5, className, ariaHidden = true }: Props) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth * 1.6} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden={ariaHidden} focusable="false">
    <path d="M32 58s-20-17.5-20-32a20 20 0 0 1 40 0c0 14.5-20 32-20 32Z" />
    <svg x="17.44" y="12.36" width="29.12" height="29.12" viewBox="0 0 64 64">
      <OrderIcon size={64} strokeWidth={strokeWidth * 2.2} />
    </svg>
  </svg>;
}
