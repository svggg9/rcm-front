import Link from "next/link";
import { DesignSystemIcon } from "../ui/DesignSystemIcon";
import styles from "./ProductShowcaseAction.module.css";

export function ProductShowcaseAction({ href, label, className = "" }: {
  href: string; label: string; className?: string;
}) {
  return <Link href={href} className={`${styles.action} ${className}`.trim()}>
    <span>{label}</span><DesignSystemIcon name="arrow-right" role="utility" />
  </Link>;
}
