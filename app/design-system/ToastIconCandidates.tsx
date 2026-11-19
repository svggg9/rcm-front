"use client";

import { CheckCheck, CircleEllipsis, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/ui/Button";
import { DesignSystemIcon } from "../components/ui/DesignSystemIcon";
import { toast } from "../components/ui/toast";
import { toastIcons } from "../components/ui/toastIcons";
import styles from "./ToastIconCandidates.module.css";

type Candidate = { name: string; note: string; icon: ReactNode };
type Group = {
  title: string;
  message: string;
  description: string;
  tone: "normal" | "info" | "success" | "warning" | "error";
  candidates: Candidate[];
};

const utility = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;
const groups: Group[] = [
  { title: "Нейтральное", message: "Изменения ещё не опубликованы", description: "Данные сохранены в черновике", tone: "normal", candidates: [
    { name: "01 — Информация", note: "Сейчас", icon: toastIcons.normal },
    { name: "02 — Сообщение", note: "Вариант", icon: <MessageCircle {...utility} /> },
    { name: "03 — Три точки", note: "Вариант", icon: <CircleEllipsis {...utility} /> },
    { name: "04 — Скруглённая i", note: "По референсу", icon: <DesignSystemIcon name="info-rounded" role="utility" /> },
  ] },
  { title: "Информация", message: "Доступны новые способы доставки", description: "Выберите подходящий способ при оформлении", tone: "info", candidates: [
    { name: "01 — Информация", note: "Сейчас", icon: toastIcons.info },
    { name: "02 — Колокольчик", note: "Общий значок", icon: <DesignSystemIcon name="bell" role="utility" /> },
    { name: "03 — Сообщение", note: "Вариант", icon: <MessageCircle {...utility} /> },
    { name: "04 — Скруглённая i", note: "По референсу", icon: <DesignSystemIcon name="info-rounded" role="utility" /> },
  ] },
  { title: "Успех", message: "Изменения сохранены", description: "Данные обновлены", tone: "success", candidates: [
    { name: "01 — Две галочки", note: "Вариант", icon: <CheckCheck {...utility} /> },
    { name: "02 — Галочка в круге", note: "Сейчас", icon: toastIcons.success },
    { name: "03 — Галочка", note: "Общий значок", icon: <DesignSystemIcon name="check" role="utility" /> },
  ] },
  { title: "Предупреждение", message: "Проверьте фотографии", description: "Рекомендуем загрузить более качественные исходники", tone: "warning", candidates: [
    { name: "01 — Треугольник", note: "Сейчас, как в референсе", icon: toastIcons.warning },
    { name: "02 — Знак в круге", note: "Общий значок", icon: <DesignSystemIcon name="alert" role="utility" /> },
  ] },
  { title: "Ошибка", message: "Не удалось сохранить", description: "Попробуйте ещё раз", tone: "error", candidates: [
    { name: "01 — Запрет", note: "Сейчас, как в референсе", icon: toastIcons.error },
    { name: "02 — Крестик в круге", note: "Общий значок", icon: <DesignSystemIcon name="cancel-circle" role="utility" /> },
    { name: "03 — Знак в круге", note: "Общий значок", icon: <DesignSystemIcon name="alert" role="utility" /> },
  ] },
];

function showCandidate(group: Group, candidate: Candidate) {
  const options = { id: "ds-toast-icon-candidate", description: group.description, icon: candidate.icon };
  if (group.tone === "normal") return toast.message(group.message, options);
  return toast[group.tone](group.message, options);
}

export function ToastIconCandidates() {
  return <section className={styles.pool} aria-labelledby="toast-icon-candidates">
    <h3 id="toast-icon-candidates">Иконки уведомлений — варианты</h3>
    <p className="textHint">Нажмите на вариант, чтобы увидеть его в рабочем уведомлении. Выбор здесь не меняет иконки на сайте</p>
    {groups.map(group => <div className={styles.group} key={group.tone}>
      <h4>{group.title}</h4>
      <div className={styles.candidates}>
        {group.candidates.map(candidate => <Button key={candidate.name} variant="secondary" className={styles.candidate}
          aria-label={`${group.title}: ${candidate.name} — показать уведомление`} onClick={() => showCandidate(group, candidate)}>
          <span className={styles.candidateContent}>
            <span className={styles.icons} data-tone={group.tone} aria-hidden="true">
              <span className={styles.large}>{candidate.icon}</span><span className={styles.regular}>{candidate.icon}</span>
            </span>
            <span className={styles.name}>{candidate.name}</span><span className={styles.note}>{candidate.note}</span>
          </span>
        </Button>)}
      </div>
    </div>)}
    <p className="textHint">Слева увеличенный вид, справа размер уведомления 20 px</p>
  </section>;
}
