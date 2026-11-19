"use client";

import { useState } from "react";
import { InsideLabelInput } from "../components/ui/InsideLabelInput";
import { NumericField } from "../components/ui/NumericField";
import { CategoryPicker } from "../components/ui/CategoryPicker";
import type { CategoryOption } from "../lib/categories";
import styles from "./InsideLabelExamples.module.css";

type Mode = "fixed" | "floating";
const demoCategories: CategoryOption[] = [
  { id: 101, name: "Рубашки", label: "Рубашки", parentId: null, slug: "shirts", sortOrder: 0, isActive: true, effectiveActive: true, productCount: 3, subtreeProductCount: 3 },
  { id: 102, name: "Футболки", label: "Футболки", parentId: null, slug: "t-shirts", sortOrder: 1, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 103, name: "Платья", label: "Платья", parentId: null, slug: "dresses", sortOrder: 2, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 104, name: "Брюки", label: "Брюки", parentId: null, slug: "trousers", sortOrder: 3, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 105, name: "Джинсы", label: "Джинсы", parentId: null, slug: "jeans", sortOrder: 4, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 106, name: "Юбки", label: "Юбки", parentId: null, slug: "skirts", sortOrder: 5, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 107, name: "Пиджаки", label: "Пиджаки", parentId: null, slug: "jackets", sortOrder: 6, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 108, name: "Свитеры и кардиганы", label: "Свитеры и кардиганы", parentId: null, slug: "knitwear", sortOrder: 7, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 109, name: "Верхняя одежда", label: "Верхняя одежда", parentId: null, slug: "outerwear", sortOrder: 8, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 110, name: "Обувь", label: "Обувь", parentId: null, slug: "shoes", sortOrder: 9, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 111, name: "Сумки", label: "Сумки", parentId: null, slug: "bags", sortOrder: 10, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 112, name: "Украшения", label: "Украшения", parentId: null, slug: "jewelry", sortOrder: 11, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 113, name: "Головные уборы", label: "Головные уборы", parentId: null, slug: "hats", sortOrder: 12, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 114, name: "Аксессуары для путешествий и повседневного использования", label: "Аксессуары для путешествий и повседневного использования", parentId: null, slug: "travel-accessories", sortOrder: 13, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
];

function ColorVariant({ title, description, className }: { title: string; description: string; className: string }) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("Мой первый бренд");
  const [email, setEmail] = useState("brand@");
  return <section className={`${styles.variant} ${styles.colorVariant} ${className}`} aria-label={title}>
    <div className={styles.variantHeading}>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
    <div className={styles.fields}>
      <InsideLabelInput mode="fixed" label="Название товара" required value={name}
        onChange={event => setName(event.target.value)} placeholder="Например, футболка из хлопка" autoComplete="off" />
      <InsideLabelInput mode="fixed" label="Название бренда" value={brand}
        onChange={event => setBrand(event.target.value)} autoComplete="off" />
      <InsideLabelInput mode="fixed" label="Электронная почта" type="email" value={email}
        onChange={event => setEmail(event.target.value)} error="Проверьте адрес электронной почты" autoComplete="off" />
    </div>
  </section>;
}

function FieldVariant({ mode, title, description, appearance }: { mode: Mode; title: string; description: string; appearance?: "warm" }) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("Мой первый бренд");
  const [email, setEmail] = useState("brand@");
  const [price, setPrice] = useState<number | null>(1490);
  const [category, setCategory] = useState<number | "">("");
  const [customCategory, setCustomCategory] = useState("");
  const [invalidCategory, setInvalidCategory] = useState<number | "">("");
  const [invalidCustomCategory, setInvalidCustomCategory] = useState("");
  return <section className={styles.variant} aria-label={title}>
    <div className={styles.variantHeading}>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
    <div className={styles.fields}>
      <InsideLabelInput mode={mode} appearance={appearance} label="Название товара" required value={name}
        onChange={event => setName(event.target.value)} placeholder="Например, футболка из хлопка" autoComplete="off" />
      <InsideLabelInput mode={mode} appearance={appearance} label="Название бренда" value={brand}
        onChange={event => setBrand(event.target.value)} autoComplete="off" />
      <InsideLabelInput mode={mode} appearance={appearance} label="Электронная почта" type="email" value={email}
        onChange={event => setEmail(event.target.value)} error="Проверьте адрес электронной почты" autoComplete="off" />
      <InsideLabelInput mode={mode} appearance={appearance} label="Недоступное поле" value="На проверке" disabled onChange={() => {}} />
      <InsideLabelInput mode={mode} appearance={appearance} label="Город производства товара" value="Москва" readOnly onChange={() => {}}
        hint="Только для чтения" />
      {appearance === "warm" && <>
        <NumericField appearance="warm" label="Цена" aria-label="Цена, ₽" suffix="₽" value={price} onValueChange={setPrice} />
        <CategoryPicker appearance="warm" label="Категория" value={category} customValue={customCategory}
          categories={demoCategories} onChange={(nextCategory, custom) => { setCategory(nextCategory); setCustomCategory(custom); }} />
        <CategoryPicker appearance="warm" label="Недоступная категория" value="" categories={demoCategories} disabled onChange={() => {}} />
        <CategoryPicker appearance="warm" label="Недоступная категория" value={101} categories={demoCategories} disabled onChange={() => {}} />
        <div>
          <CategoryPicker appearance="warm" label="Категория с ошибкой" value={invalidCategory} customValue={invalidCustomCategory}
            categories={demoCategories} invalid={invalidCategory === "" && !invalidCustomCategory.trim()}
            errorId="warm-category-example-error" onChange={(nextCategory, custom) => { setInvalidCategory(nextCategory); setInvalidCustomCategory(custom); }} />
          {invalidCategory === "" && !invalidCustomCategory.trim() && <p className="fieldError" id="warm-category-example-error">Выберите категорию</p>}
        </div>
      </>}
    </div>
  </section>;
}

export function InsideLabelExamples() {
  return <div id="field-label-candidates" className={styles.examples}>
    <div className={styles.heading}>
      <h3>Подпись внутри поля</h3>
      <p>Выбранный вариант — нажмите на поле и попробуйте ввести текст</p>
    </div>
    <div className={styles.chosen}>
      <FieldVariant mode="fixed" appearance="warm" title="Светлый контур" description="Белый фон, серый контур и подпись 12 px" />
    </div>
    <details className={styles.previousExamples}>
      <summary>Другие оттенки для сравнения</summary>
      <div className={styles.variants}>
        <ColorVariant className={styles.neutral} title="Нейтральный" description="Светло-серый — подпись 12 px, средняя" />
        <ColorVariant className={styles.sand} title="Выразительный тёплый" description="Более тёплый серый — подпись 12 px, средняя" />
      </div>
    </details>
    <details className={styles.previousExamples}>
      <summary>Предыдущее сравнение поведения подписи</summary>
      <div className={styles.variants}>
        <FieldVariant mode="fixed" title="Подпись всегда сверху" description="Название постоянно находится внутри поля над значением" />
        <FieldVariant mode="floating" title="Подпись поднимается" description="Название поднимается при вводе или нажатии на поле" />
      </div>
    </details>
  </div>;
}
