import styles from "../ProductEditPage.module.css";

type Props = {
  title: string;
  hint: string;
  required?: boolean;
};

export function SectionHeader({ title, required }: Props) {
  return (
    <div className={styles.sectionHeader}>
      <h2 className={required ? `textTitle ${styles.required}` : "textTitle"}>{title}</h2>
    </div>
  );
}
