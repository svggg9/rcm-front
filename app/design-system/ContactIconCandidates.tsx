import type { ReactNode } from "react";

export type ContactIconCandidateName = "profile" | "phone" | "location" | "email" | "website";

type Props = {
  name: ContactIconCandidateName;
  size?: number;
  circled?: boolean;
};

const contours: Record<ContactIconCandidateName, ReactNode> = {
  profile: <>
    <circle cx="32" cy="24" r="8" />
    <path d="M20 48a12 12 0 0 1 24 0" />
  </>,
  phone: <path d="m22 16 6 7-3.5 4c2.7 5.1 6.4 8.8 11.5 11.5l4-3.5 7 6-4 5c-1.2 1.5-3.3 2-5.1 1.3-10-4.1-18.1-12.2-22.2-22.2-.7-1.8-.2-3.9 1.3-5.1L22 16Z" />,
  location: <>
    <path d="M32 49s-12-13-12-22a12 12 0 1 1 24 0c0 9-12 22-12 22Z" />
    <circle cx="32" cy="26" r="4.5" />
  </>,
  email: <>
    <rect x="16" y="21" width="32" height="23" rx="1.5" />
    <path d="m17 22 15 12 15-12M17 43l10.8-11M47 43 36.2 32" />
  </>,
  website: <>
    <circle cx="32" cy="32" r="16" />
    <path d="M16 32h32M18.5 23h27M18.5 41h27M32 16c-5 4-7 9.5-7 16s2 12 7 16M32 16c5 4 7 9.5 7 16s-2 12-7 16" />
  </>,
};

/** Unapproved reference-inspired alternatives for the design-system pool. */
export function ContactIconCandidate({ name, size = 64, circled = true }: Props) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor"
    strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {circled && <circle cx="32" cy="32" r="28" />}
    <g transform={circled ? undefined : "translate(-8 -8) scale(1.25)"}>{contours[name]}</g>
  </svg>;
}
