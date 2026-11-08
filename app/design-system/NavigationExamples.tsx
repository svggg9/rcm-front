"use client";

import { useState } from "react";
import { CabinetPanel } from "../components/ui/CabinetPanel";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import styles from "./DesignSystem.module.css";

const tabs = [
  { value: "orders", label: "Заказы" },
  { value: "payments", label: "Проверка оплат" },
  { value: "returns", label: "Возвраты" },
  { value: "history", label: "История операций" },
];

export function NavigationExamples() {
  const [tab, setTab] = useState("orders");
  return <div className={styles.stack}>
    <h3>Вкладки и длинный ряд</h3>
    <CabinetPanel items={tabs} value={tab} onChange={setTab} ariaLabel="Демонстрационные разделы">
      <p className="textHint">Открыт раздел «{tabs.find(item => item.value === tab)?.label}»</p>
    </CabinetPanel>
    <p className="textHint">На узком экране ряд прокручивается, выбранная вкладка остаётся видимой. Стрелки, Home и End переключают вкладки</p>
    <h3>Недоступный выбор</h3>
    <SegmentedControl ariaLabel="Недоступный демонстрационный выбор" value="first" onChange={() => {}} disabled
      items={[{value:"first",label:"Первый"},{value:"second",label:"Второй"}]} />
  </div>;
}
