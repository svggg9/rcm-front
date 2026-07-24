import styles from "../ProductEditPage.module.css";

type Props = {
  title: string;
  hint: string;
};

export function SectionHeader({ title }: Props) {
  return (
    <div className={styles.sectionHeader}>
      <h2 className="textTitle">{title}</h2>
    </div>
  );
}
