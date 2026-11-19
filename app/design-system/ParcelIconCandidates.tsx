import type { ReactNode } from "react";
import { OrderIcon } from "../components/ui/OrderIcon";
import { DeliveryTruckIcon } from "../components/ui/DeliveryTruckIcon";
import { PickupPointIcon } from "../components/ui/PickupPointIcon";

export type ParcelIconCandidateName =
  | "parcel-outline"
  | "parcel-tape"
  | "parcel-color"
  | "parcel-color-soft"
  | "pickup-outline"
  | "pickup-color"
  | "truck-outline"
  | "truck-motion";

type Props = { name: ParcelIconCandidateName; size?: number };

function Canvas({ size, children }: { size: number; children: ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    {children}
  </svg>;
}

/** Exploratory SVGs for design review; they are not production icon selections. */
export function ParcelIconCandidate({ name, size = 64 }: Props) {
  if (name === "parcel-outline") return <Canvas size={size}>
    <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 7 54 18.5v27L32 57 10 45.5v-27L32 7Z" />
      <path d="m10 18.5 22 11.6 22-11.6M32 30.1V57" />
      <path d="m21 13 22 11.6v6.2l-6 3.1v-6.2L15 16.2" />
    </g>
  </Canvas>;

  if (name === "parcel-tape") return <OrderIcon size={size} />;

  if (name === "parcel-color" || name === "parcel-color-soft") {
    const soft = name === "parcel-color-soft";
    return <Canvas size={size}>
      <path d="M32 7 54 18.5 32 30 10 18.5 32 7Z" fill={soft ? "#E9D5B3" : "#DDB77F"} />
      <path d="M10 18.5 32 30v27L10 45.5v-27Z" fill={soft ? "#C7A579" : "#B78959"} />
      <path d="M54 18.5 32 30v27l22-11.5v-27Z" fill={soft ? "#D7BA90" : "#D3A36B"} />
      <path d="m22 12.2 7-3.6L51 20l-7 3.6L22 12.2Z" fill={soft ? "#B08D57" : "#FFF8E9"} />
      <path d="m44 23.6 7-3.6v8.5l-7 3.6v-8.5Z" fill={soft ? "#9B794C" : "#F1E2CA"} />
    </Canvas>;
  }

  if (name === "pickup-outline") return <PickupPointIcon size={size} />;

  if (name === "pickup-color") return <Canvas size={size}>
    <path d="M32 59S12 41.4 12 26a20 20 0 0 1 40 0c0 15.4-20 33-20 33Z" fill="#B08D57" />
    <circle cx="32" cy="26" r="14" fill="#FFF" />
    <path d="m32 16.7 9.6 5-9.6 5.1-9.6-5.1 9.6-5Z" fill="#E3C69E" />
    <path d="m22.4 21.7 9.6 5.1v11l-9.6-5v-11.1Z" fill="#B88E60" />
    <path d="m41.6 21.7-9.6 5.1v11l9.6-5V21.7Z" fill="#D0A777" />
    <path d="m28 18.8 3.2-1.7 9.6 5-3.2 1.7-9.6-5Z" fill="#FFF8EA" />
    <path d="m37.6 23.8 3.2-1.7v3.8l-3.2 1.7v-3.8Z" fill="#F3E4CF" />
  </Canvas>;

  if (name === "truck-outline") return <DeliveryTruckIcon size={size} />;

  return <Canvas size={size}>
    <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 16h23v28H23M18 35v4M41 24h8l8 9v11h-4m-12 0h2" />
      <path d="M45 24v10h12M7 19h14M4 26h20M9 33h12" />
      <circle cx="18" cy="44" r="5" />
      <circle cx="48" cy="44" r="5" />
    </g>
  </Canvas>;
}
