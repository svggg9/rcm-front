import { Ban, TriangleAlert } from "lucide-react";
import { DesignSystemIcon } from "./DesignSystemIcon";

export type FeedbackIconTone = "info" | "success" | "warning" | "error";

const icons = { warning: TriangleAlert, error: Ban };

export function FeedbackIcon({ tone, className }: { tone: FeedbackIconTone; className?: string }) {
  if (tone === "info") return <DesignSystemIcon name="info" role="utility" className={className} />;
  if (tone === "success") return <DesignSystemIcon name="check-circle" role="utility" className={className} />;
  const Icon = icons[tone];
  return <Icon size={20} strokeWidth={1.5} className={className} aria-hidden />;
}
