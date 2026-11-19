import { ProfileIcon } from "../components/ui/NavigationIcons";

export type ProfileIconCandidateName = "circle" | "bust" | "shoulders" | "portrait";

/** Reference-inspired alternatives for comparison in the design system. */
export function ProfileIconCandidate({ name, size = 24 }: { name: ProfileIconCandidateName; size?: number }) {
  if (name === "circle") return <ProfileIcon size={size} />;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {name === "bust" && <>
        <path d="M12 3.2c-2 0-3.4 1.5-3.4 3.7 0 2.5 1.4 4.4 3.4 4.4s3.4-1.9 3.4-4.4c0-2.2-1.4-3.7-3.4-3.7Z" />
        <path d="M4.6 19.5v-1.6c0-2.8 3.3-4.8 7.4-4.8s7.4 2 7.4 4.8v1.6H4.6Z" />
      </>}
      {name === "shoulders" && <>
        <circle cx="12" cy="7.4" r="3.4" />
        <path d="M4.3 20.2v-1.4c0-3 3.1-5.2 7.7-5.2s7.7 2.2 7.7 5.2v1.4" />
      </>}
      {name === "portrait" && <>
        <path d="M12 3c-2.2 0-3.6 1.6-3.6 4 0 2.7 1.4 4.6 3.6 4.6s3.6-1.9 3.6-4.6C15.6 4.6 14.2 3 12 3Z" />
        <path d="M7.3 13.7c-1.7.9-2.9 2.4-2.9 4.4v2h15.2v-2c0-2-1.2-3.5-2.9-4.4l-2.1-1.1-2.6 2-2.6-2-2.1 1.1Z" />
      </>}
    </svg>
  );
}

