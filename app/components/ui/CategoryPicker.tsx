"use client";

import { buildCategoryTree, flattenCategoryTree, type CategoryOption } from "../../lib/categories";
import { FormCombobox } from "./FormCombobox";
import { RequestError } from "./RequestError";
import { Loader } from "./Loader";

type Props = {
  label?: string;
  value: number | "";
  customValue?: string;
  currentLabel?: string | null;
  categories: CategoryOption[];
  onChange: (value: number | "", customValue: string) => void;
  required?: boolean;
  invalid?: boolean;
  errorId?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  allowCustomValue?: boolean;
};

export function CategoryPicker({ label = "Категория", value, customValue = "", currentLabel,
  categories, onChange, required, invalid, errorId, disabled, loading, error, onRetry, allowCustomValue = true }: Props) {
  const ordered = flattenCategoryTree(buildCategoryTree(categories));
  const options = ordered.filter(category => category.effectiveActive || category.id === value)
    .map(category => ({ value: category.id, label: category.name, disabled: !category.effectiveActive,
      searchTerms: [category.label, ...(category.aliases ?? [])] }));
  const unavailable = value !== "" && !categories.some(category => category.id === value && category.effectiveActive);
  if (value !== "" && !options.some(option => option.value === value) && currentLabel) {
    options.push({ value, label: currentLabel, disabled: true, searchTerms: [] });
  }
  return (
    <div aria-busy={loading || undefined}>
      <FormCombobox label={label} value={value} customValue={customValue} options={options}
        placeholder="Найти категорию" showPlaceholderOption={false} required={required} invalid={invalid} errorId={errorId}
        disabled={disabled || loading || Boolean(error)} loading={loading} allowCustomValue={allowCustomValue}
        emptyText="Категории не найдены" onChange={onChange} />
      {error ? <RequestError variant="inline" message={error} onRetry={onRetry} loading={loading} /> : null}
      {loading && !error ? <Loader inline label="Загрузка категорий" /> : null}
      {!error && !loading && unavailable ? <p className="textMuted textSmall">Категория недоступна для новых публикаций — выберите другую</p> : null}
      {!error && !loading && allowCustomValue && customValue ? <p className="textMuted textSmall">Предложенная категория будет проверена при модерации</p> : null}
    </div>
  );
}
