import { DataTable } from "../components/ui/DataTable";
import { Price } from "../components/ui/Price";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./DataTableExample.module.css";

export function DataTableExample() {
  return <div className={styles.scroller} tabIndex={0} role="region" aria-label="Прокрутка демонстрационной таблицы">
    <DataTable className={styles.table} aria-label="Демонстрационная таблица товаров">
      <thead><tr><th scope="col">Товар</th><th scope="col">Статус</th><th scope="col">Цена</th><th scope="col">Остаток</th></tr></thead>
      <tbody>
        <tr><td>Рубашка из хлопка</td><td><StatusBadge tone="success">Активен</StatusBadge></td><td><Price amount={5900} /></td><td>12 шт</td></tr>
        <tr><td>Сумка</td><td><StatusBadge>Черновик</StatusBadge></td><td><Price amount={3900} /></td><td>4 шт</td></tr>
      </tbody>
    </DataTable>
  </div>;
}
