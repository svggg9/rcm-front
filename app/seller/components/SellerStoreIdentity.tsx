import Link from "next/link";
import { DesignSystemIcon } from "../../components/ui/DesignSystemIcon";
import styles from "./SellerStoreIdentity.module.css";

export function SellerStoreIdentity({ name, href = "/seller/store" }: { name: string; href?: string }) {
  return <Link href={href} className={styles.identity} aria-label={`Настроить магазин ${name}`}>
    <strong>{name}</strong>
    <DesignSystemIcon name="settings" role="utility" />
  </Link>;
}
