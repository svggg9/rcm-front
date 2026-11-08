"use client";
import { Checkbox } from "../components/ui/Checkbox";
import { Radio } from "../components/ui/Radio";

import { useId, useState } from "react";
import { Button } from "../components/ui/Button";
import { ConfirmActionButton } from "../components/ui/ConfirmActionButton";
import { ListLoadMore } from "../components/ui/ListLoadMore";
import { NotificationBadge } from "../components/ui/NotificationBadge";
import { Price } from "../components/ui/Price";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { SizeOptions } from "../components/ui/SizeOptions";
import { BrandWordmark } from "../components/ui/BrandWordmark";
import { CategoryPicker } from "../components/ui/CategoryPicker";
import styles from "./DesignSystem.module.css";

export function CategoryStatesPattern() {
  const [state, setState] = useState("ready");
  const [value, setValue] = useState<number | "">("");
  return <div className={styles.demo}><h3>Асинхронный выбор категории</h3>
    <SegmentedControl ariaLabel="Состояние выбора категории" value={state} onChange={setState} items={[
      {value:"ready",label:"Готово"},{value:"empty",label:"Пусто"},{value:"loading",label:"Загрузка"},{value:"error",label:"Ошибка"},{value:"disabled",label:"Недоступно"},
    ]} />
    <CategoryPicker label="Категория в разных состояниях" value={value} allowCustomValue={false}
      categories={state === "empty" ? [] : [{id:101,name:"Рубашки",label:"Рубашки",parentId:null,slug:"shirts",sortOrder:0,isActive:true,effectiveActive:true,productCount:3,subtreeProductCount:3}]}
      onChange={setValue} loading={state === "loading"} disabled={state === "disabled"}
      error={state === "error" ? "Не удалось загрузить категории" : null} onRetry={() => setState("ready")} />
    <p className="textHint">Демонстрация состояний без сетевых запросов. Повтор после ошибки возвращает готовый список, недоступное поле сохраняет выбранное значение</p>
  </div>;
}

export function SelectionPatterns() {
  const [mode, setMode] = useState("all");
  const [size, setSize] = useState<number | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [radio, setRadio] = useState("first");
  const radioName = useId();
  return <div className={styles.ruleGrid}>
    <article><h3>Один режим или фильтр</h3><SegmentedControl ariaLabel="Демонстрационный фильтр товаров" value={mode} onChange={setMode} items={[{value:"all",label:"Все"},{value:"active",label:"Активные"},{value:"archive",label:"Архив",disabled:true},{value:"draft",label:"Черновики"}]} /><p className="textHint">Стрелки, Home и End меняют выбор и пропускают недоступные варианты. Для переходов между страницами используем ссылки и CabinetTabs</p></article>
    <article><h3>Размер товара</h3><SizeOptions options={[{id:1,size:"S",availableQuantity:3},{id:2,size:"M",availableQuantity:0},{id:3,size:"L",availableQuantity:2}]} value={size} onChange={setSize} /><p className="textHint">Недоступный размер виден и не выбирается. Выбор размера сохраняет отдельную семантику SizeOptions</p></article>
    <article><h3>Несколько независимых значений</h3>
      <label className={styles.checkbox}><Checkbox size={18} checked={choices.length === 2}
        ref={node => { if (node) node.indeterminate = choices.length === 1; }}
        onChange={event => setChoices(event.target.checked ? ["first", "second"] : [])} />Выбрать все примеры</label>
      {[["first", "Первый пример"], ["second", "Второй пример"]].map(([value, label]) => <label key={value} className={styles.checkbox}>
        <Checkbox size={18} checked={choices.includes(value)} onChange={event => setChoices(current => event.target.checked ? [...current, value] : current.filter(item => item !== value))} />{label}
      </label>)}
      <label className={styles.checkbox}><Checkbox size={18} disabled />Недоступный пример</label>
      <p className="textHint">Checkbox сохраняет native checked, disabled, indeterminate и работу ref</p>
    </article>
    <article><h3>Один вариант в форме</h3>
      {[["first", "Первый вариант"], ["second", "Второй вариант"]].map(([value, label]) => <label key={value} className={styles.checkbox}>
        <Radio name={radioName} value={value} checked={radio === value} onChange={() => setRadio(value)} />{label}
      </label>)}
      <p className="textHint">Radio сохраняет общий name и native клавиатурную навигацию группы</p>
    </article>
  </div>;
}

export function FormatPatterns() {
  return <div className={styles.ruleGrid}>
    <article><h3>Цена и числа</h3><dl className={styles.formatList}>
      <div><dt>Целая сумма</dt><dd><Price amount={12900} /></dd></div>
      <div><dt>С копейками</dt><dd><Price amount={12900.5} maximumFractionDigits={2} /></dd></div>
      <div><dt>Нулевая сумма</dt><dd><Price amount={0} /></dd></div>
    </dl><p className="textHint">Price использует ru-RU: пробел между разрядами, запятая перед дробной частью. Ноль и неизвестная стоимость имеют разный смысл</p></article>
    <article><h3>Счётчик уведомлений</h3><div className={styles.actions}>{[1,12,125].map(count => <span key={count} className={styles.badgeSample} aria-label={`Уведомлений: ${count}`}><NotificationBadge count={count} /></span>)}</div><p className="textHint">NotificationBadge скрыт от скринридера; полное число указывается в доступном имени родительского действия</p></article>
    <article><h3>Бренд без файла логотипа</h3><div className={styles.wordmarkSample}><BrandWordmark name="Мой бренд" /></div><p className="textHint">BrandWordmark показывает имя, если файл не задан или не загрузился</p></article>
  </div>;
}

export function OverlayPatterns() {
  const [result, setResult] = useState(false);
  const [fail, setFail] = useState(false);
  return <div className={styles.stack}>
    <p className={styles.note}>Dialog — короткое действие, EditorSurface — редактор, InfoHint — небольшое пояснение. Native dialog и popover находятся в top layer; увеличение z-index не заменяет правильный контейнер</p>
    <label className={styles.checkbox}><Checkbox size={18}  checked={fail} onChange={e => setFail(e.target.checked)} />Сымитировать ошибку подтверждения</label>
    <div className={styles.actions}><ConfirmActionButton variant="danger" confirmTitle="Удалить демонстрационный элемент?" confirmText="Это только пример — рабочие данные не меняются" onConfirm={() => {
      if (fail) throw new Error("Не удалось выполнить пример — снимите флажок и повторите");
      setResult(true);
    }}>Открыть подтверждение</ConfirmActionButton></div>
    <p className="textHint" role="status">{result ? "Действие в примере подтверждено" : "Отмена и Escape сохраняют элемент"}</p>
  </div>;
}

export function LoadMorePattern() {
  const [loaded, setLoaded] = useState(4);
  return <div className={styles.stack}><h3>Продолжение списка</h3><ListLoadMore loaded={loaded} total={12} onLoadMore={() => setLoaded(value => Math.min(value + 4, 12))} />{loaded === 12 ? <p className="textHint" role="status">Показаны все 12 элементов</p> : null}<div className={styles.actions}><Button type="button" variant="utility" onClick={() => setLoaded(4)}>Сбросить пример списка</Button></div></div>;
}
