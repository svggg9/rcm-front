import { useState } from "react";
import { FormSelect } from "../components/ui/FormSelect";
import styles from "./DisabledFieldCandidates.module.css";

const options = [{ value: "moscow", label: "Москва" }];

export function DisabledFieldCandidates() {
  const [city, setCity] = useState<string | "">("");
  return <section id="disabled-field-candidates" className={styles.section}>
    <div className={styles.heading}>
      <h3>Пустое и недоступное поле</h3>
      <p>Пустое поле можно открыть и выбрать город; недоступное поле не открывается</p>
    </div>
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.cardHeading}>
          <h4>Доступное пустое поле</h4>
          <p>Серая подсказка и чёрная стрелка</p>
        </div>
        <FormSelect<string> label="Город" value={city} placeholder="Не выбран" options={options} onChange={setCity} />
      </div>
      <div className={styles.card}>
        <div className={styles.cardHeading}>
          <h4>Недоступное поле</h4>
          <p>Серые значение и стрелка</p>
        </div>
        <FormSelect<string> label="Город" value="" placeholder="Не выбран" options={options} disabled onChange={() => {}} />
        <FormSelect label="Город" value="moscow" options={options} disabled onChange={() => {}} />
      </div>
    </div>
  </section>;
}
