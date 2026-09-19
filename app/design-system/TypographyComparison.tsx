import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { TextInput } from "../components/ui/TextInput";
import fieldStyles from "./FieldPreview.module.css";
import styles from "./TypographyComparison.module.css";

export function TypographyComparison() {
  return (
    <div className={styles.comparison}>
      <p className={styles.intro}>
        Слева — выбранная основа. Справа — те же размеры и кнопки, но чёрные пояснения
        и алерт без рамки. В обоих вариантах Inter
      </p>
      <div className={styles.columns}>
        {[false, true].map(proposed => (
          <article key={String(proposed)} className={`${styles.column} ${proposed ? `${styles.proposed} ${fieldStyles.fields}` : ""}`}
            aria-labelledby={proposed ? "type-proposed" : "type-current"}>
            <header className={styles.heading}>
              <h3 id={proposed ? "type-proposed" : "type-current"}>{proposed ? "С вашими правками" : "Выбранная основа"}</h3>
              <p>{proposed ? "Небольшие чёрные подписи и спокойный алерт" : "Прежний левый вариант без изменений"}</p>
            </header>

            <div className={styles.sample}>
              <div className={styles.search}>
                <Icon name="search" size={24} strokeWidth={1.5} />
                <TextInput type="search" label="Поиск в примере" hideLabel
                  placeholder="Что вы ищете?" className={styles.searchInput}
                  autoComplete="off" />
              </div>

              <div className={styles.copy}>
                <h4 className="textSectionTitle">Войти в аккаунт</h4>
                <p className="textBody">Все ваши покупки и заказы в одном месте</p>
                <p className={`textSmall muted ${styles.secondary}`}>Используйте почту, указанную при регистрации</p>
              </div>

              <div className={styles.fieldWrap}>
                <TextInput label="Электронная почта" type="email" placeholder={proposed ? undefined : "you@example.com"}
                  autoComplete="off" />
              </div>

              <div className={`${proposed ? `${styles.proposedAlert} textBody` : "alertDanger"} ${styles.message}`}>
                <Icon name="alert" size={24} strokeWidth={1.5} />
                <p>Неверный адрес электронной почты или пароль</p>
              </div>

              <div className={styles.buttons}>
                <Button type="button" variant="primary" className={styles.button}>Войти</Button>
                <Button type="button" variant="secondary" className={styles.button}>Продолжить с одноразовым кодом</Button>
              </div>
              <p className={`textCaption muted ${styles.caption}`}>Это пример оформления — вход не выполняется</p>
            </div>

            <ul className={styles.parameters} aria-label="Параметры варианта">
              <li>Основной текст 15 px / 21 px / 400</li>
              <li>{proposed ? "Пояснения 15 px / 300, чёрный цвет" : "Пояснения 15 px / 300, серый цвет"}</li>
              <li>{proposed ? "Ввод 14 px / 400, подпись 12 px / 400" : "Ввод 14 px / 400, подпись 12 px / 300"}</li>
              <li>Кнопка 15 px / 600, высота 42 px</li>
              {proposed ? <li>Текст алерта 15 px, без увеличения</li> : null}
            </ul>
          </article>
        ))}
      </div>
      <p className={styles.intro}>Размеры левого варианта сохранены; справа подписи полей усилены до обычного начертания. Правки пока только в эталоне — рабочие страницы не менялись</p>
    </div>
  );
}
