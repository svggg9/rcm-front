"use client";

import {
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import { toast } from "sonner";

import { Button } from "../../components/ui/Button";
import { FormSelect } from "../../components/ui/FormSelect";
import { Icon } from "../../components/ui/Icon";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { apiFetch, API_URL } from "../../lib/api";
import { formatRussianPhone } from "../../lib/phone";

import styles from "./AccountProfileTab.module.css";

export type AccountProfileUpdate = {
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  gender: "men" | "women" | null;
};

type Props = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  gender: "men" | "women" | null;
  saving: boolean;
  initialEditing?: boolean;
  onSave: (values: AccountProfileUpdate) => Promise<boolean>;
  onEditingChange?: (editing: boolean) => void;
};

type ProfileFieldProps = {
  label: string;
  inputRef?: Ref<HTMLInputElement>;
};

type BirthParts = {
  day: string;
  month: string;
  year: string;
};

type ProfileDraft = BirthParts & {
  firstName: string;
  lastName: string;
  phone: string;
  gender: "" | "men" | "women";
};

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const day = String(index + 1).padStart(2, "0");
  return { value: day, label: String(index + 1) };
});

const MONTH_OPTIONS = [
  { value: "01", label: "Январь" },
  { value: "02", label: "Февраль" },
  { value: "03", label: "Март" },
  { value: "04", label: "Апрель" },
  { value: "05", label: "Май" },
  { value: "06", label: "Июнь" },
  { value: "07", label: "Июль" },
  { value: "08", label: "Август" },
  { value: "09", label: "Сентябрь" },
  { value: "10", label: "Октябрь" },
  { value: "11", label: "Ноябрь" },
  { value: "12", label: "Декабрь" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) => {
  const year = String(CURRENT_YEAR - index);
  return { value: year, label: year };
});

const GENDER_OPTIONS = [
  { value: "men", label: "Мужской" },
  { value: "women", label: "Женский" },
];

function ProfileTextField({
  label,
  inputRef,
  className = "",
  required = false,
  ...props
}: ProfileFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.fieldWrap}>
      <span className={styles.fieldLabel}>
        {label}
        {required ? <span className={styles.requiredMark}> *</span> : null}
      </span>
      <input
        ref={inputRef}
        className={[styles.input, className].filter(Boolean).join(" ")}
        required={required}
        {...props}
      />
    </label>
  );
}

function splitBirthDate(value: string): BirthParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return { day: "", month: "", year: "" };
  }

  return {
    day: match[3],
    month: match[2],
    year: match[1],
  };
}

function createDraft({
  firstName,
  lastName,
  phone,
  birthDate,
  gender,
}: Pick<
  Props,
  "firstName" | "lastName" | "phone" | "birthDate" | "gender"
>): ProfileDraft {
  return {
    firstName,
    lastName,
    phone,
    gender: gender ?? "",
    ...splitBirthDate(birthDate),
  };
}

function formatBirthDate(value: string): string {
  const { day, month, year } = splitBirthDate(value);
  return day && month && year ? `${day}.${month}.${year}` : "Не указана";
}

function formatGender(value: Props["gender"]): string {
  if (value === "men") return "Мужской";
  if (value === "women") return "Женский";
  return "Не указан";
}

function buildBirthDate(parts: BirthParts): {
  value: string;
  error: string | null;
} {
  const values = [parts.day, parts.month, parts.year];

  if (values.every((value) => !value)) {
    return { value: "", error: null };
  }

  if (values.some((value) => !value)) {
    return { value: "", error: "Укажите день, месяц и год" };
  }

  const day = Number(parts.day);
  const month = Number(parts.month);
  const year = Number(parts.year);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return { value: "", error: "Проверьте дату рождения" };
  }

  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (parsed.getTime() > todayUtc) {
    return { value: "", error: "Дата рождения не может быть в будущем" };
  }

  return {
    value: `${parts.year}-${parts.month}-${parts.day}`,
    error: null,
  };
}

export function AccountProfileTab({
  email,
  firstName,
  lastName,
  phone,
  birthDate,
  gender,
  saving,
  initialEditing = false,
  onSave,
  onEditingChange,
}: Props) {
  const [editing, setEditing] = useState(initialEditing);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    createDraft({ firstName, lastName, phone, birthDate, gender }),
  );
  const [dateError, setDateError] = useState<string | null>(null);
  const [passwordResetSending, setPasswordResetSending] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const firstNameRef = useRef<HTMLInputElement | null>(null);

  const savedDraft = createDraft({
    firstName,
    lastName,
    phone,
    birthDate,
    gender,
  });
  const changed =
    JSON.stringify(draft) !== JSON.stringify(savedDraft);

  function beginEditing() {
    setDraft(savedDraft);
    setDateError(null);
    setEditing(true);
    onEditingChange?.(true);
    window.requestAnimationFrame(() => firstNameRef.current?.focus());
  }

  function cancelEditing() {
    if (saving) return;

    setDraft(savedDraft);
    setDateError(null);
    setEditing(false);
    onEditingChange?.(false);
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      toast.error("Заполните имя и фамилию");
      firstNameRef.current?.focus();
      return;
    }

    const nextBirthDate = buildBirthDate(draft);
    setDateError(nextBirthDate.error);

    if (nextBirthDate.error) return;

    const saved = await onSave({
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phone: draft.phone,
      birthDate: nextBirthDate.value,
      gender: draft.gender || null,
    });

    if (saved) {
      setEditing(false);
      onEditingChange?.(false);
    }
  }

  async function requestPasswordReset() {
    if (passwordResetSending) return;
    if (!email.trim()) {
      toast.error("К аккаунту не привязана электронная почта");
      return;
    }

    try {
      setPasswordResetSending(true);

      const response = await apiFetch(
        `${API_URL}/api/auth/password/reset/start`,
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim() }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.message || "Не удалось отправить письмо для смены пароля",
        );
      }

      setPasswordResetSent(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось отправить письмо для смены пароля",
      );
    } finally {
      setPasswordResetSending(false);
    }
  }

  if (editing) {
    return (
      <section
        className={styles.editorPanel}
        aria-labelledby="account-profile-editor-title"
      >
        <header className={styles.editorHeader}>
          <h2 id="account-profile-editor-title">Данные и безопасность</h2>
          <h3>Личные данные</h3>
          <p>
            <span className={styles.requiredMark}>*</span> Обязательные поля
          </p>
        </header>

        <form className={styles.editorForm} onSubmit={handleProfileSubmit}>
          <ProfileTextField
            label="Имя"
            inputRef={firstNameRef}
            value={draft.firstName}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
            autoComplete="given-name"
            required
          />

          <ProfileTextField
            label="Фамилия"
            value={draft.lastName}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
            autoComplete="family-name"
            required
          />

          <ProfileTextField
            label="Электронная почта"
            type="email"
            value={email}
            autoComplete="email"
            readOnly
            required
          />

          <ProfileTextField
            label="Подтвердите электронную почту"
            type="email"
            value={email}
            autoComplete="email"
            readOnly
            required
          />

          <div className={styles.phoneField}>
            <PhoneInput
              label="Телефон"
              fieldVariant="boxed"
              value={draft.phone}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
            />
            <p className={styles.fieldHint}>
              Номер нужен только для связи по вашему заказу
            </p>
          </div>

          <fieldset className={styles.dateFieldset}>
            <legend>Дата рождения</legend>
            <div className={styles.dateSelects}>
              <FormSelect<string>
                label="День"
                value={draft.day}
                options={DAY_OPTIONS}
                placeholder="День"
                invalid={Boolean(dateError)}
                onChange={(value) => {
                  setDateError(null);
                  setDraft((current) => ({ ...current, day: value }));
                }}
              />
              <FormSelect<string>
                label="Месяц"
                value={draft.month}
                options={MONTH_OPTIONS}
                placeholder="Месяц"
                invalid={Boolean(dateError)}
                onChange={(value) => {
                  setDateError(null);
                  setDraft((current) => ({ ...current, month: value }));
                }}
              />
              <FormSelect<string>
                label="Год"
                value={draft.year}
                options={YEAR_OPTIONS}
                placeholder="Год"
                invalid={Boolean(dateError)}
                onChange={(value) => {
                  setDateError(null);
                  setDraft((current) => ({ ...current, year: value }));
                }}
              />
            </div>
            {dateError ? (
              <p className={styles.fieldError}>{dateError}</p>
            ) : null}
            <p className={styles.fieldHint}>
              Добавьте дату и получите подарок ко дню рождения по программе
              лояльности
            </p>
          </fieldset>

          <FormSelect<"men" | "women">
            label="Пол"
            value={draft.gender}
            options={GENDER_OPTIONS}
            placeholder="Не указан"
            onChange={(value) =>
              setDraft((current) => ({ ...current, gender: value }))
            }
          />

          <div className={styles.editorActions}>
            <Button
              type="button"
              variant="secondary"
              className={styles.cancelButton}
              onClick={cancelEditing}
              disabled={saving}
            >
              Отменить
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={!changed}
            >
              Сохранить
            </Button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section
      className={styles.detailsPanel}
      aria-labelledby="account-profile-title"
    >
      <h2 id="account-profile-title">Данные и безопасность</h2>

      <dl className={styles.detailsList}>
        <div className={styles.detailItem}>
          <dt>Имя</dt>
          <dd>{firstName.trim() || "—"}</dd>
        </div>
        <div className={styles.detailItem}>
          <dt>Фамилия</dt>
          <dd>{lastName.trim() || "—"}</dd>
        </div>
        <div className={styles.detailItem}>
          <dt>Электронная почта</dt>
          <dd>{email.trim() || "—"}</dd>
        </div>
        <div className={styles.detailItem}>
          <dt>Телефон</dt>
          <dd>{formatRussianPhone(phone) || "Не указан"}</dd>
        </div>
        <div className={styles.detailItem}>
          <dt>Дата рождения</dt>
          <dd>{formatBirthDate(birthDate)}</dd>
          {!birthDate ? (
            <p className={styles.detailHint}>
              Добавьте дату и получите подарок ко дню рождения по программе
              лояльности
            </p>
          ) : null}
        </div>
        <div className={styles.detailItem}>
          <dt>Пол</dt>
          <dd>{formatGender(gender)}</dd>
        </div>
        <div className={styles.detailItem}>
          <dt>Пароль</dt>
          <dd className={styles.passwordValue}>
            <span aria-label="Пароль скрыт">••••••••</span>
            <button
              type="button"
              onClick={() => void requestPasswordReset()}
              disabled={passwordResetSending}
            >
              {passwordResetSending ? (
                <span className="buttonLoader" aria-hidden="true" />
              ) : passwordResetSent ? (
                "Отправить ещё раз"
              ) : (
                "Изменить пароль"
              )}
            </button>
          </dd>
        </div>
      </dl>

      {passwordResetSent ? (
        <div
          className={styles.passwordInfo}
          role="status"
          aria-live="polite"
        >
          <Icon name="check-circle" size={20} strokeWidth={1.6} />
          <p>
            Мы отправили письмо на указанный адрес. Если его нет во входящих,
            проверьте папку «Спам».
          </p>
        </div>
      ) : null}

      <div className={styles.detailsActions}>
        <Button
          type="button"
          variant="secondary"
          className={styles.editButton}
          onClick={beginEditing}
        >
          Изменить
        </Button>
      </div>

    </section>
  );
}
