import { Loader } from "./Loader";
import styles from "./SectionLoader.module.css";

type Props = {
  label?: string;
  compact?: boolean;
  fullPage?: boolean;
  className?: string;
};

export function SectionLoader({
  label = "Загрузка раздела",
  compact = false,
  fullPage = false,
  className = "",
}: Props) {
  return <div data-ui="section-loader"
    className={[styles.section, compact && styles.compact, fullPage && styles.fullPage, className].filter(Boolean).join(" ")}>
    <Loader inline label={label} className={styles.spinner} />
  </div>;
}
