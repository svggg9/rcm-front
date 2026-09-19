"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { Textarea } from "../../components/ui/Textarea";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FormSelect } from "../../components/ui/FormSelect";
import { Dialog } from "../../components/ui/Dialog";
import { Icon } from "../../components/ui/Icon";
import styles from "./PanelsPreview.module.css";

type Mode = "edit" | "create" | "collection";
const products = ["Шёлковая рубашка", "Брюки прямого кроя", "Жакет из шерсти"];

export function PanelsPreview() {
  const [mode, setMode] = useState<Mode | null>(null);
  return <main className={styles.page}>
    <p className={styles.eyebrow}>Дизайн-система / На согласование</p>
    <h1>Работа поверх списка</h1>
    <p className={styles.intro}>Три сценария. Откройте форму, измените поле и попробуйте закрыть её — список останется на месте. Все данные в макете условные</p>
    <div className={styles.launchers}>
      <Button onClick={() => setMode("edit")}>Редактировать товар</Button>
      <Button onClick={() => setMode("create")}>Создать товар</Button>
      <Button onClick={() => setMode("collection")}>Создать подборку</Button>
    </div>
    <div className={styles.tableWrap}><table className={styles.table}>
      <thead><tr><th>Фото</th><th>Название</th><th>Статус</th><th>Цена</th><th /></tr></thead>
      <tbody>{products.map((name, i) => <tr key={name}>
        <td><div className={styles.thumb}><Icon name="package" size={24} /></div></td>
        <td>{name}</td><td><StatusBadge size="regular" tone={i ? "success" : "default"}>{i ? "Активен" : "Черновик"}</StatusBadge></td>
        <td>{[12900, 16900, 24900][i].toLocaleString("ru-RU")} ₽</td>
        <td><Button variant="tertiary" onClick={() => setMode("edit")}>Открыть</Button></td>
      </tr>)}</tbody>
    </table></div>
    <p className={styles.intro}>Редактор товара — панель справа. Подборка — компактное окно по центру. На телефоне формы занимают весь экран</p>
    {mode ? <Editor key={mode} mode={mode} close={() => setMode(null)} /> : null}
  </main>;
}

function Editor({ mode, close }: { mode: Mode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [name, setName] = useState(mode === "edit" ? products[0] : "");
  const [category, setCategory] = useState<string | "">(mode === "edit" ? "shirts" : "");
  const [selected, setSelected] = useState([0, 1]);
  const collection = mode === "collection";
  const title = collection ? "Новая подборка" : mode === "edit" ? "Редактирование товара" : "Новый товар";
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, []);
  function requestClose() { if (dirty) setConfirmClose(true); else close(); }
  function save() {
    if (!name.trim()) { ref.current?.querySelector<HTMLInputElement>("input")?.focus(); return; }
    setDirty(false);
    toast.success("Макет: изменения сохранены только для демонстрации", { duration: 1500 });
    close();
  }
  return <>
    <dialog ref={ref} className={`${styles.panel} ${collection ? styles.modal : ""}`} aria-labelledby="panel-title"
      onCancel={event => { event.preventDefault(); requestClose(); }}>
      <header className={styles.panelHeader}>
        <div><p className={styles.eyebrow}>Товары / {collection ? "Подборки" : "Карточка товара"}</p><h2 id="panel-title">{title}</h2></div>
        {!collection ? <StatusBadge size="regular">Черновик</StatusBadge> : null}
        <Button variant="ghost" className={styles.close} aria-label="Закрыть" onClick={requestClose}><Icon name="x" size={24} /></Button>
      </header>
      <div className={styles.body} onChange={() => setDirty(true)}>
        <p className={styles.demoNote}>Интерактивный макет · Данные не отправляются на сервер</p>
        {collection ? <div className={styles.stack}>
          <TextInput label="Название подборки" placeholder="Например, Осенняя коллекция" value={name} onChange={event => setName(event.target.value)} />
          <Textarea label="Описание" hint="Необязательно" rows={2} placeholder="Что объединяет эти товары" />
          <div><h3>Товары в подборке</h3><p className={styles.muted}>Выбрано {selected.length} из 12</p></div>
          {products.map((product, i) => <label className={styles.pick} key={product}>
            <input type="checkbox" checked={selected.includes(i)} onChange={() => setSelected(current => current.includes(i) ? current.filter(n => n !== i) : [...current, i])} />
            <div className={styles.thumb}><Icon name="package" size={24} /></div><span>{product}</span>
          </label>)}
        </div> : <div className={styles.editorGrid}>
          <section className={styles.stack}><h3>Основное</h3>
            <TextInput label="Название товара" value={name} placeholder="Укажите название" onChange={event => setName(event.target.value)} />
            <FormSelect label="Категория" value={category} placeholder="Выберите категорию" options={[{value: "shirts", label: "Рубашки"}, {value: "jackets", label: "Жакеты"}]} onChange={value => { setCategory(value); setDirty(true); }} />
            <Textarea label="Описание" rows={5} defaultValue={mode === "edit" ? "Рубашка свободного кроя с длинным рукавом и перламутровыми пуговицами" : ""} />
            <TextInput label="Состав" defaultValue={mode === "edit" ? "100% шёлк" : ""} />
            <h3>Цена и остаток</h3>
            <div className={styles.twoColumns}><TextInput label="Цена, ₽" defaultValue={mode === "edit" ? "12900" : ""} inputMode="decimal" /><TextInput label="Количество" defaultValue="12" inputMode="numeric" /></div>
            <TextInput label="Артикул продавца" defaultValue={mode === "edit" ? "SH-001" : ""} />
            <h3>Упаковка и доставка</h3>
            <div className={styles.twoColumns}>{["Вес, кг", "Длина, см", "Ширина, см", "Высота, см"].map(label => <TextInput key={label} label={label} inputMode="decimal" />)}</div>
          </section>
          <aside className={styles.stack}><h3>Фотографии</h3><div className={styles.photo}><Icon name="package" size={48} /><span>Основное фото</span></div>
            <div className={styles.photoStrip}>{[1,2,3].map(n => <div key={n}><Icon name="plus" size={20} /></div>)}</div>
            <p className={styles.muted}>Здесь будет загрузка и порядок фотографий товара</p>
          </aside>
        </div>}
      </div>
      <footer className={styles.footer}><span className={styles.muted}>{dirty ? "Есть несохранённые изменения" : collection ? "До 12 товаров в подборке" : "Сохраните черновик или отправьте товар на проверку"}</span>
        <div className={styles.footerButtons}>
          <Button variant="secondary" onClick={collection ? requestClose : save} disabled={!collection && !name.trim()}>{collection ? "Отмена" : "Сохранить"}</Button>
          <Button variant="primary" disabled={!name.trim() || (collection && !selected.length)} onClick={save}>{collection ? "Создать подборку" : "На модерацию"}</Button>
        </div>
      </footer>
    </dialog>
    {confirmClose ? <Dialog title="Закрыть без сохранения?" onClose={() => setConfirmClose(false)} actions={<>
      <Button onClick={() => setConfirmClose(false)}>Продолжить редактирование</Button><Button variant="primary" onClick={close}>Закрыть без сохранения</Button>
    </>}><p>Внесённые изменения не сохранятся</p></Dialog> : null}
  </>;
}
