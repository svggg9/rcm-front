import { BuyerNavigationIcon } from "../components/BuyerNavigation/BuyerNavigationIcon";
import { FavoritesNavigationIcon } from "../components/BuyerNavigation/FavoritesNavigationIcon";
import { CartIcon } from "../components/ui/CartIcon";
import { DetailsIcon } from "../components/ui/DetailsIcon";
import { FeedbackIcon, type FeedbackIconTone } from "../components/ui/FeedbackIcon";
import { Icon, type IconName } from "../components/ui/Icon";
import { StatusBadge } from "../components/ui/StatusBadge";
import styles from "./IconSystemGallery.module.css";

type IconEntry = {
  title: string;
  name: IconName | "buyer-cart" | "buyer-heart" | "buyer-menu" | "details" | FeedbackIconTone;
  kind?: "feedback";
};

const groups: { title: string; entries: IconEntry[] }[] = [
  { title: "Навигация", entries: [
    { title: "Меню", name: "buyer-menu" },
    { title: "Поиск", name: "search" },
    { title: "Профиль", name: "user" },
    { title: "Избранное", name: "buyer-heart" },
    { title: "Корзина", name: "buyer-cart" },
    { title: "Влево", name: "chevron-left" },
    { title: "Вправо", name: "chevron-right" },
    { title: "Вниз", name: "chevron-down" },
    { title: "Вверх", name: "chevron-up" },
    { title: "Перейти", name: "arrow-right" },
    { title: "Открыть", name: "arrow-up-right" },
  ] },
  { title: "Товары и заказы", entries: [
    { title: "Товар", name: "package" },
    { title: "Заказ", name: "shopping-bag" },
    { title: "Пункт выдачи", name: "pickup-point" },
    { title: "Передача в доставку", name: "shipment-handoff" },
    { title: "Возврат", name: "return-circle" },
    { title: "Фото", name: "images" },
    { title: "Магазин", name: "store" },
    { title: "Витрина администратора", name: "dashboard" },
    { title: "Доставка администратора", name: "truck" },
    { title: "Реквизиты продавца", name: "details" },
    { title: "Документ", name: "file" },
    { title: "Выплаты", name: "money" },
    { title: "Кошелёк", name: "wallet" },
    { title: "Ожидание", name: "clock" },
  ] },
  { title: "Действия", entries: [
    { title: "Изменить", name: "pencil" },
    { title: "Фильтры", name: "sliders" },
    { title: "Удалить", name: "trash" },
    { title: "Закрыть", name: "x" },
    { title: "Добавить", name: "plus" },
    { title: "Уменьшить", name: "minus" },
    { title: "Выбрано", name: "check" },
    { title: "Настройки", name: "settings" },
    { title: "Список", name: "list" },
    { title: "Показать пароль", name: "eye" },
    { title: "Скрыть пароль", name: "eye-off" },
  ] },
  { title: "Сообщения", entries: [
    { title: "Информация", name: "info", kind: "feedback" },
    { title: "Успех", name: "success", kind: "feedback" },
    { title: "Предупреждение", name: "warning", kind: "feedback" },
    { title: "Ошибка", name: "error", kind: "feedback" },
    { title: "Ошибка запроса", name: "alert" },
    { title: "Отмена заказа", name: "cancel-circle" },
  ] },
];

function GalleryIcon({ entry, size }: { entry: IconEntry; size: number }) {
  if (entry.kind === "feedback") return <span className={styles.feedback} style={{ width: size, height: size }}><FeedbackIcon tone={entry.name as FeedbackIconTone} /></span>;
  if (entry.name === "buyer-cart") return <CartIcon size={size} />;
  if (entry.name === "details") return <DetailsIcon size={size} />;
  if (entry.name === "buyer-heart" || entry.name === "buyer-menu") {
    return <span className={styles.buyer} style={{ width: size, height: size }}><BuyerNavigationIcon name={entry.name === "buyer-heart" ? "heart" : "menu"} /></span>;
  }
  return <Icon name={entry.name as IconName} size={size} />;
}

export function IconSystemGallery() {
  return <div className={styles.gallery}>
    <p className={styles.intro}>Используемые значки из рабочих компонентов. Крупный вид помогает рассмотреть детали, рядом — размеры интерфейса</p>
    {groups.map(group => <section key={group.title} className={styles.group} id={group.title === "Навигация" ? "edit-pagination-icon-candidates" : group.title === "Товары и заказы" ? "more-icon-candidates" : undefined}>
      <h3>{group.title}</h3>
      <ul className={styles.grid} aria-label={group.title}>
        {group.entries.map(entry => <li className={styles.card} key={`${entry.kind ?? "icon"}-${entry.name}`} id={entry.name === "return-circle" ? "return-icon-candidates" : entry.name === "sliders" ? "filter-icon-candidates" : entry.name === "trash" ? "delete-icon-candidates" : entry.name === "details" ? "details-icon-candidates" : undefined}>
          <span className={styles.title}>{entry.title}</span>
          <StatusBadge tone="success" size="regular">Активно</StatusBadge>
          <span className={styles.large}><GalleryIcon entry={entry} size={56} /></span>
          <span className={styles.caption}>Крупный вид</span>
          <div className={styles.sizes}>
            {[24, 20].map(size => <span className={styles.size} key={size}>
              <GalleryIcon entry={entry} size={size} /><span className={styles.caption}>{size} px</span>
            </span>)}
          </div>
          {entry.name === "buyer-heart" && <span className={styles.counter}><FavoritesNavigationIcon count={4} /><span className={styles.caption}>Со счётчиком</span></span>}
        </li>)}
      </ul>
    </section>)}
  </div>;
}
