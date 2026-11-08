"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { FormCombobox } from "../components/ui/FormCombobox";
import { FormMultiSelect } from "../components/ui/FormMultiSelect";
import { FormSelect } from "../components/ui/FormSelect";
import styles from "./DesignSystem.module.css";

const categories = [
  { value: 1, label: "Рубашки" },
  { value: 2, label: "Куртки" },
  { value: 3, label: "Платья" },
  { value: 4, label: "Архивная категория", disabled: true },
];
const collectionOptions = [
  { value: "new", label: "Новинки" },
  { value: "summer", label: "Летняя коллекция" },
  { value: "bestsellers", label: "Бестселлеры" },
  { value: "archive", label: "Архивная подборка", disabled: true },
];
const catalogOptions = [
  { value: "clothing", label: "Одежда" },
  { value: "home-art", label: "Дом и искусство" },
];
const longLabel = "Аксессуары для путешествий и повседневного использования — сумки, рюкзаки и небольшие кожаные изделия";

export function DropdownExamples() {
  const [basicCategory, setBasicCategory] = useState<string>("");
  const [category, setCategory] = useState<number | "">("");
  const [customCategory, setCustomCategory] = useState("");
  const [errorCategory, setErrorCategory] = useState<number | "">("");
  const [errorCustomCategory, setErrorCustomCategory] = useState("");
  const [collections, setCollections] = useState<string[]>([]);
  const [selectValue, setSelectValue] = useState<string>("");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [longValue, setLongValue] = useState<string>("long");
  const [edgeValue, setEdgeValue] = useState<number | "">(1);
  const [menusDisabled, setMenusDisabled] = useState(false);
  const [showMultiError, setShowMultiError] = useState(false);
  const [locking, setLocking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCollections, setDialogCollections] = useState<string[]>([]);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (lockTimer.current) clearTimeout(lockTimer.current); }, []);
  const comboInvalid = !errorCategory && !errorCustomCategory.trim();

  function scheduleLock() {
    if (menusDisabled) { setMenusDisabled(false); return; }
    setLocking(true);
    lockTimer.current = setTimeout(() => {
      setMenusDisabled(true);
      setLocking(false);
      lockTimer.current = null;
    }, 2000);
  }

  return <div id="dropdowns" className={styles.dropdownExamples}>
    <div className={styles.fieldExampleGroup}>
      <h3>Один вариант</h3>
      <div className={styles.formGrid}>
        <FormSelect label="Категория" value={basicCategory} onChange={setBasicCategory}
          placeholder="Выберите категорию" options={catalogOptions} hint="Выбранный вариант отмечен галочкой" />
        <div className={styles.quantityExample}>
          <FormSelect<number> label="Количество" size="compact" value={quantity} onChange={setQuantity}
            options={[1, 2, 3, 4, 5].map(value => ({ value, label: String(value) }))} />
        </div>
        <FormSelect label="Длинное выбранное значение" value={longValue} onChange={setLongValue}
          options={[{ value: "long", label: longLabel }, { value: "short", label: "Аксессуары" }]}
          hint="Полное название доступно при наведении и в открытом списке" />
        <FormSelect label="Список только для чтения" value="clothing" options={catalogOptions}
          readOnly onChange={() => {}} hint="Значение доступно для чтения, изменить его нельзя" />
        <FormSelect label="Недоступный список" value="home-art" options={catalogOptions} disabled onChange={() => {}} />
        <FormSelect<string> label="Пустой список" value="" options={[]} required
          emptyText="Нет доступных категорий" onChange={() => {}} />
        <FormSelect label="Селект с ошибкой" required value={selectValue}
          error={!selectValue ? "Выберите категорию" : undefined} onChange={setSelectValue} options={catalogOptions} />
      </div>
    </div>

    <div className={styles.fieldExampleGroup}>
      <h3>Поиск и новый вариант</h3>
      <div className={styles.formGrid}>
        <FormCombobox label="Категория с поиском" value={category} customValue={customCategory}
          options={categories} showModerationBadge={false} disabled={menusDisabled}
          hint="Введите Руб — существующий результат и предложение нового варианта показаны отдельно"
          onChange={(value, custom) => { setCategory(value); setCustomCategory(custom); }} />
        <FormCombobox label="Поиск с ошибкой" value={errorCategory} customValue={errorCustomCategory}
          options={categories} required error={comboInvalid ? "Выберите категорию" : undefined}
          showModerationBadge={false}
          onChange={(value, custom) => { setErrorCategory(value); setErrorCustomCategory(custom); }} />
      </div>
      <p className={styles.note}>Стрелки перемещают по вариантам, Enter подтверждает выбор, Escape закрывает список, Tab переводит к следующему полю</p>
    </div>

    <div className={styles.fieldExampleGroup}>
      <h3>Несколько вариантов</h3>
      <div className={styles.formGrid}>
        <FormMultiSelect<string> label="Несколько значений" required placeholder="Выберите подборки" disabled={menusDisabled}
          values={collections} onChange={setCollections} options={collectionOptions}
          error={showMultiError && !collections.length ? "Выберите хотя бы одну подборку" : undefined}
          hint="Можно выбрать несколько подборок, архивный вариант недоступен" />
        <FormMultiSelect<string> label="Множественный выбор только для чтения" values={["new", "bestsellers"]}
          options={collectionOptions} readOnly onChange={() => {}} />
        <FormMultiSelect<string> label="Пустой множественный список" values={[]} options={[]}
          emptyText="Подборок пока нет" onChange={() => {}} />
        <div className={styles.fieldExampleGroup}>
          <div className={styles.actions}>
            <Button type="button" size="compact" onClick={() => setShowMultiError(true)}>Проверить выбор подборок</Button>
            <Button type="button" variant="utility" size="compact" disabled={locking} onClick={scheduleLock}>
              {menusDisabled ? "Разблокировать списки" : "Проверить блокировку через 2 секунды"}
            </Button>
          </div>
          <p className={styles.note} role="status">{menusDisabled
            ? "Поиск и множественный выбор заблокированы, выбранные значения сохранены"
            : locking ? "Откройте поиск или множественный список — при блокировке он закроется" : "Проверка блокировки уже открытого поиска и множественного списка"}</p>
        </div>
      </div>
    </div>

    <div className={styles.fieldExampleGroup}>
      <h3>Список внутри панели</h3>
      <div className={styles.formGrid}>
        <div className={styles.fieldExampleGroup}>
          <div className={styles.actions}>
            <Button type="button" onClick={() => setDialogOpen(true)}>Открыть список в диалоге</Button>
          </div>
          <p className={styles.note}>Откройте список в окне и нажмите Escape: сначала закрывается список, повторное нажатие закрывает окно</p>
        </div>
        <div className={styles.dropdownScrollPanel} role="region" aria-label="Прокручиваемая панель со списком" tabIndex={0}>
          <div className={styles.dropdownScrollContent}>
            <p className={styles.note}>Прокрутите панель вниз и откройте список у её нижнего края</p>
            <div className={styles.dropdownScrollSpacer} aria-hidden="true" />
            <FormSelect<number> label="Категория у края панели" value={edgeValue} onChange={setEdgeValue}
              options={Array.from({ length: 8 }, (_, index) => ({ value: index + 1, label: `Категория ${index + 1}` }))} />
          </div>
        </div>
      </div>
    </div>

    {dialogOpen && <Dialog title="Выбор подборок" onClose={() => setDialogOpen(false)}
      actions={<Button type="button" onClick={() => setDialogOpen(false)}>Готово</Button>}>
      <FormMultiSelect<string> label="Подборки в диалоге" values={dialogCollections} options={collectionOptions}
        onChange={setDialogCollections} hint="Все действия относятся только к этому примеру" />
    </Dialog>}
  </div>;
}
