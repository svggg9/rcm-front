"use client";
import { Checkbox } from "../../components/ui/Checkbox";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { EditorSurface, requestEditorNavigation } from "../../components/ui/EditorSurface";
import { FormSelect } from "../../components/ui/FormSelect";
import { Icon } from "../../components/ui/Icon";
import { NumericField } from "../../components/ui/NumericField";
import { Price } from "../../components/ui/Price";
import { DataTable } from "../../components/ui/DataTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { TextInput } from "../../components/ui/TextInput";
import { Textarea } from "../../components/ui/Textarea";
import { toast } from "../../components/ui/toast";
import { scrollToFirstValidationError } from "../../lib/formValidation";
import { INTEGER_RULES } from "../../lib/numericInput";
import { useFieldValidation } from "../../lib/useFieldValidation";
import styles from "./PanelsPreview.module.css";

type Mode = "edit" | "create" | "collection";
const products = ["Шёлковая рубашка", "Брюки прямого кроя", "Жакет из шерсти"];

export function PanelsPreview() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [productName, setProductName] = useState(products[0]);
  return <div className={`pageContainer ${styles.page}`}>
    <Link href="/design-system#overlays" className={styles.back}>Дизайн-система</Link>
    <h1 className="textPageTitle">Окна и редакторы</h1>
    <p className={styles.intro}>Общий EditorSurface: товар открывается в панели справа, подборка — в компактном окне. На телефоне редактор занимает весь экран</p>
    <div className={styles.launchers}>
      <Button onClick={() => { setProductName(products[0]); setMode("edit"); }}>Редактировать товар</Button>
      <Button onClick={() => setMode("create")}>Создать товар</Button>
      <Button onClick={() => setMode("collection")}>Создать подборку</Button>
    </div>
    <div className={styles.tableWrap}><DataTable className={styles.table}>
      <caption className="visuallyHidden">Демонстрационный список товаров</caption>
      <thead><tr><th scope="col">Фото</th><th scope="col">Название</th><th scope="col">Статус</th><th scope="col">Цена</th><th scope="col"><span className="visuallyHidden">Действия</span></th></tr></thead>
      <tbody>{products.map((name, index) => <tr key={name}>
        <td><div className={styles.thumb}><Icon name="package" size={24} /></div></td>
        <td>{name}</td><td><StatusBadge size="regular" tone={index ? "success" : "default"}>{index ? "Активен" : "Черновик"}</StatusBadge></td>
        <td><Price amount={[12900, 16900, 24900][index]} /></td>
        <td><Button variant="ghost" onClick={() => { setProductName(name); setMode("edit"); }} aria-label={`Открыть пример редактора: ${name}`}>Открыть</Button></td>
      </tr>)}</tbody>
    </DataTable></div>
    <p className="textHint">Измените поле и закройте редактор, чтобы проверить защиту несохранённых изменений. Сохранение меняет только демонстрационный пример</p>
    {mode ? <Editor key={`${mode}-${productName}`} mode={mode} productName={productName} close={() => setMode(null)} /> : null}
  </div>;
}

function Editor({ mode, productName, close }: { mode: Mode; productName: string; close: () => void }) {
  const collection = mode === "collection";
  const [initial] = useState(() => ({
    name: mode === "edit" ? productName : "",
    description: mode === "edit" ? "Рубашка свободного кроя с длинным рукавом" : "",
    category: mode === "edit" ? "shirts" : "",
    price: mode === "edit" ? "12900" : "",
    quantity: "12",
    selected: [0, 1],
  }));
  const [values, setValues] = useState(initial);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const categoryErrorId = useId();
  const selectionErrorId = useId();
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const validation = useFieldValidation(values, draft => ({
    ...(!draft.name.trim() ? { name: collection ? "Укажите название подборки" : "Укажите название товара" } : {}),
    ...(!collection && !draft.category ? { category: "Выберите категорию" } : {}),
    ...(collection && !draft.selected.length ? { selected: "Выберите хотя бы один товар" } : {}),
  }));
  function change<K extends keyof typeof values>(key: K, value: typeof values[K]) {
    setValues(current => ({ ...current, [key]: value }));
    validation.changed(key);
  }
  return <EditorSurface title={collection ? "Новая подборка" : mode === "edit" ? "Редактирование товара" : "Новый товар"}
    headerMeta={!collection ? <StatusBadge>Черновик</StatusBadge> : undefined}
    compact={collection} dirty={dirty} guardNavigation onClose={close}
    actions={<Button type="submit" form={formId} variant="primary">Сохранить пример</Button>}>
    <form id={formId} ref={formRef} className={styles.stack} noValidate onSubmit={event => {
      event.preventDefault();
      if (Object.keys(validation.validate()).length) {
        scrollToFirstValidationError({ root: formRef.current });
        return;
      }
      toast.success("Пример сохранён — рабочие данные не менялись");
      requestEditorNavigation(close, { completed: true });
    }}>
      <p className="textHint">Демонстрационные данные, без запросов к серверу</p>
      <TextInput label={collection ? "Название подборки" : "Название товара"} required value={values.name}
        error={validation.errors.name} onBlur={() => validation.touch("name")}
        onChange={event => change("name", event.target.value)} />
      {!collection ? <div>
        <FormSelect label="Категория" required value={values.category} invalid={Boolean(validation.errors.category)}
          errorId={validation.errors.category ? categoryErrorId : undefined}
          options={[{ value: "shirts", label: "Рубашки" }, { value: "jackets", label: "Жакеты" }]}
          onBlur={() => validation.touch("category")} onChange={value => change("category", value)} />
        {validation.errors.category ? <div id={categoryErrorId} className="fieldError">{validation.errors.category}</div> : null}
      </div> : null}
      <Textarea label="Описание" hint="Необязательно" rows={3} value={values.description}
        onChange={event => change("description", event.target.value)} />
      {collection ? <fieldset className={styles.selection} aria-invalid={Boolean(validation.errors.selected)}
        aria-describedby={validation.errors.selected ? selectionErrorId : undefined}>
        <legend>Товары в подборке</legend>
        <p className="textHint">Выбрано {values.selected.length} из {products.length}</p>
        {products.map((product, index) => <label className={styles.pick} key={product}>
          <Checkbox  checked={values.selected.includes(index)} onChange={() => change("selected",
            values.selected.includes(index) ? values.selected.filter(value => value !== index) : [...values.selected, index].sort())} />
          <span>{product}</span>
        </label>)}
        {validation.errors.selected ? <p id={selectionErrorId} className="fieldError">{validation.errors.selected}</p> : null}
      </fieldset> : <div className={styles.twoColumns}>
        <NumericField label="Цена, ₽" value={values.price} onChange={event => change("price", event.target.value)} />
        <NumericField label="Количество" value={values.quantity} {...INTEGER_RULES}
          onChange={event => change("quantity", event.target.value)} />
      </div>}
    </form>
  </EditorSurface>;
}
