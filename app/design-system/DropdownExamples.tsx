"use client";

import { useState } from "react";
import { FormCombobox } from "../components/ui/FormCombobox";
import { FormMultiSelect } from "../components/ui/FormMultiSelect";
import { FormSelect } from "../components/ui/FormSelect";

const categories = [
  { value: 1, label: "Рубашки" },
  { value: 2, label: "Куртки" },
  { value: 3, label: "Платья" },
];

export function DropdownExamples() {
  const [category, setCategory] = useState<number | "">("");
  const [customCategory, setCustomCategory] = useState("");
  const [errorCategory, setErrorCategory] = useState<number | "">("");
  const [errorCustomCategory, setErrorCustomCategory] = useState("");
  const [collections, setCollections] = useState<string[]>([]);
  const [selectValue, setSelectValue] = useState<string>("");
  const [quantity, setQuantity] = useState<number | "">(1);
  const comboInvalid = !errorCategory && !errorCustomCategory.trim();

  return <>
    <div style={{ width: 64 }}>
      <FormSelect<number> label="Количество" size="compact" value={quantity} onChange={setQuantity}
        options={[1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }))} />
    </div>
    <FormCombobox label="Категория с поиском" value={category} customValue={customCategory}
      options={categories} showModerationBadge={false}
      onChange={(value, custom) => { setCategory(value); setCustomCategory(custom); }} />
    <div>
      <FormCombobox label="Поиск с ошибкой" value={errorCategory} customValue={errorCustomCategory}
        options={categories} required invalid={comboInvalid} errorId="ds-combobox-error"
        showModerationBadge={false}
        onChange={(value, custom) => { setErrorCategory(value); setErrorCustomCategory(custom); }} />
      {comboInvalid ? <div className="fieldError" id="ds-combobox-error">Выберите категорию</div> : null}
    </div>
    <FormMultiSelect<string> label="Несколько значений" required placeholder=""
      values={collections} onChange={setCollections}
      options={[
        { value: "new", label: "Новинки" },
        { value: "summer", label: "Летняя коллекция" },
        { value: "bestsellers", label: "Бестселлеры" },
      ]} />
    <div>
      <FormSelect<string> label="Селект с ошибкой" required value={selectValue}
        invalid={!selectValue} errorId="ds-select-error" onChange={setSelectValue}
        options={[{ value: "clothing", label: "Одежда" }, { value: "home-art", label: "Дом и искусство" }]} />
      {!selectValue ? <div className="fieldError" id="ds-select-error">Выберите категорию</div> : null}
    </div>
  </>;
}
