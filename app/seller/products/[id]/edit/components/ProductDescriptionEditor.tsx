import { TextEditor } from "../../../../../components/ui/TextEditor";

type Props = { value: string; onChange: (value: string) => void; fieldName?: string; maxLength?: number; emptyText?: string; invalid?: boolean; errorId?: string };
export function ProductDescriptionEditor({ value, onChange, fieldName = "Описание товара", maxLength = 2000, invalid, errorId }: Props) {
  return <TextEditor value={value} onChange={onChange} label={fieldName} maxLength={maxLength} invalid={invalid} errorId={errorId}
    placeholder={fieldName === "Состав" ? "Например, 100% хлопок" : "Расскажите о товаре: материал, посадка, особенности и уход"} />;
}
