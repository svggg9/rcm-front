import type { IconName } from "../components/ui/Icon";
import { DesignSystemIcon, iconSizes, type IconRole } from "./DesignSystemIcon";
import styles from "./IconOptionsPreview.module.css";

const selectedIcons = [
  { title: "Товар", label: "Куб", icon: "package" },
  { title: "Заказ", label: "Чек", icon: "shopping-bag" },
  { title: "Передать в доставку", label: "Грузовик", icon: "shipment-handoff" },
] as const;

const sizeExamples: { role: IconRole; title: string; icon: IconName }[] = [
  { role: "utility", title: "Служебные", icon: "chevron-down" },
  { role: "interface", title: "Навигация и задачи", icon: "shopping-bag" },
  { role: "empty", title: "Пустые состояния", icon: "package" },
];

export function IconOptionsPreview() {
  return (
    <div className={styles.preview}>
      <ul className={styles.options} aria-label="Выбранные иконки">
        {selectedIcons.map(({ title, label, icon }) => <li key={title}>
          <span className={styles.title}>{title}</span>
          <span className={styles.symbol}><DesignSystemIcon name={icon} /></span>
          <span className={styles.label}>{label}</span>
        </li>)}
      </ul>
      <h3>Размеры по назначению</h3>
      <ul className={styles.options} aria-label="Размеры иконок">
        {sizeExamples.map(({ role, title, icon }) => <li key={role}>
          <span className={styles.title}>{title}</span>
          <span className={styles.symbol}><DesignSystemIcon name={icon} role={role} /></span>
          <span className={styles.label}>{iconSizes[role]} px</span>
        </li>)}
      </ul>
      <p className={styles.note}>Контур 1,5, чёрный цвет. Цветные иконки — только для статусов. Размеры и образы согласованы, перенос на рабочие экраны — отдельно</p>
    </div>
  );
}
