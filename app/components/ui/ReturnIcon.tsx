import { OrderIcon } from "./OrderIcon";

type Props = { size?: number; strokeWidth?: number; className?: string; ariaHidden?: boolean };

export function ReturnIcon({ size = 24, strokeWidth = 1.5, className, ariaHidden = true }: Props) {
  const scaledStrokeWidth = strokeWidth * (2.8 / 1.5);
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none"
    aria-hidden={ariaHidden} focusable="false">
    <g stroke="currentColor" strokeWidth={scaledStrokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.029 15.029A24 24 0 1 1 8.818 38.212" />
      <path d="M15.029 8v7.029h7.029" />
    </g>
    <svg x="14.5" y="14.5" width="35" height="35" viewBox="0 0 64 64">
      <OrderIcon size={64} strokeWidth={scaledStrokeWidth} />
    </svg>
  </svg>;
}
