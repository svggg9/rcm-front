"use client";

import { useState } from "react";
import { Button } from "../components/ui/Button";
import { EditorSurface } from "../components/ui/EditorSurface";
import { toast } from "../components/ui/toast";
import styles from "./DesignSystem.module.css";

const editorId = "ds-toast-editor";

export function ToastExamples() {
  const [editorOpen, setEditorOpen] = useState(false);
  const success = (toasterId?: string) => toast.success("Подборка создана", {
    id: toasterId ? "ds-editor-feedback" : "ds-feedback", toasterId,
    description: undefined, action: undefined,
  });
  const error = (toasterId?: string) => toast.error("Не удалось сохранить товар", {
    id: toasterId ? "ds-editor-feedback" : "ds-feedback", toasterId,
    description: "Проверьте отмеченные поля и повторите сохранение",
    action: {
      label: "Открыть товар",
      onClick: () => toast.dismiss(toasterId ? "ds-editor-feedback" : "ds-feedback"),
    },
  });
  const warning = (toasterId?: string) => toast.warning("Проверьте фотографии", {
    id: toasterId ? "ds-editor-feedback" : "ds-feedback", toasterId,
    description: "Рекомендуем загрузить более качественные исходники",
    action: undefined,
  });
  const info = (toasterId?: string) => toast.info("Изменения ещё не опубликованы", {
    id: toasterId ? "ds-editor-feedback" : "ds-feedback", toasterId,
    description: "Отправьте карточку на модерацию",
    action: undefined,
  });

  return <>
    <Button onClick={() => success()}>Показать уведомление об успехе</Button>
    <Button onClick={() => error()}>Показать уведомление об ошибке</Button>
    <Button onClick={() => warning()}>Показать предупреждение</Button>
    <Button onClick={() => info()}>Показать информацию</Button>
    <Button onClick={() => { toast.dismiss("ds-feedback"); setEditorOpen(true); }}>Проверить уведомления в редакторе</Button>
    {editorOpen ? <EditorSurface title="Пример уведомлений" centered toastId={editorId}
      onClose={() => setEditorOpen(false)}
      actions={<Button onClick={() => success(editorId)}>Сохранить пример</Button>}>
      <p>Демонстрационные данные. Запросы на сервер не отправляются.</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => error(editorId)}>Ошибка</Button>
        <Button variant="secondary" onClick={() => warning(editorId)}>Предупреждение</Button>
        <Button variant="secondary" onClick={() => info(editorId)}>Информация</Button>
      </div>
    </EditorSurface> : null}
  </>;
}
