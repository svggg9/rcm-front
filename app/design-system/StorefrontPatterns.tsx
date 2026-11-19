"use client";

import { useState } from "react";
import { MobilePanelHeader } from "../components/BuyerNavigation/MobilePanelHeader";
import { ProductImageCarousel } from "../components/ProductImageCarousel/ProductImageCarousel";
import { ProductShowcaseAction } from "../components/ProductShowcase/ProductShowcaseAction";
import { ProductTile } from "../components/ProductTile/ProductTile";
import { FavoriteCard } from "../favorites/FavoriteCard";
import { FormError } from "../components/ui/FormError";
import { Loader } from "../components/ui/Loader";
import { SortIndicator } from "../components/ui/SortIndicator";
import { PhotoPlaceholder } from "../components/ui/PhotoPlaceholder";
import { ProductInfoCandidates } from "./ProductInfoCandidates";
import { ProductInfoHeading } from "../product/[id]/components/ProductInfoHeading";
import { CartItemExample } from "./CartItemExample";
import styles from "./StorefrontPatterns.module.css";

const demoProduct = { id: 0, title: "Футболка — пример", brand: "РЦМАРКЕТ", minPrice: 5900,
  images: ["/examples/demo-shirt-front.svg", "/examples/demo-shirt-back.svg"] };
const demoDetailsProduct = {
  id: 0, sellerId: 0, title: "Сумка с короткими ручками", brand: "РЦМАРКЕТ", category: "Аксессуары / Сумки",
  audience: "WOMEN" as const, images: [], variants: [], brandDescription: "Бренд создаёт аксессуары для повседневных образов",
  description: "Синяя сумка с короткими ручками и несколькими отделениями. Вместительная модель на каждый день: для прогулок, работы и поездок по городу. Яркий цвет добавит акцент к однотонному образу.",
  composition: "Наружный материал: полиуретан 100%\nПодкладка: полиэстер 100%\nФурнитура: сплав металлов",
  details: { features: "Две короткие ручки\nЗастёжка на молнию сверху\nВместительное основное отделение\nВнутренний карман на молнии\nТекстильная подкладка",
    measurements: "Ширина: 32 см\nВысота: 24 см\nГлубина: 12 см\nВысота ручек: 16 см",
    care: "Удалять загрязнения мягкой влажной тканью\nНе стирать и не замачивать", cityOfOrigin: "Гуанчжоу" },
};

export function StorefrontPatterns() {
  const [liked, setLiked] = useState(false);
  const [favoriteLiked, setFavoriteLiked] = useState(true);
  const [favoriteSize, setFavoriteSize] = useState("");
  const [panelAction, setPanelAction] = useState("");
  const [image, setImage] = useState<number | null>(null);
  return <div className={styles.patterns}>
    <CartItemExample />
    <section aria-labelledby="ds-product-details">
      <h3 id="ds-product-details">Информация на странице товара</h3>
      <p className="textHint">Три способа разместить полную информацию о товаре; данные в примере условные</p>
      <div className={styles.productDetails}>
        <ProductInfoHeading brand={demoDetailsProduct.brand} title={demoDetailsProduct.title} titleAs="h4" priceLabel="6 900" />
      </div>
      <ProductInfoCandidates product={demoDetailsProduct} />
    </section>
    <section aria-labelledby="ds-product-tile">
      <h3 id="ds-product-tile">Карточка товара</h3>
      <p className="textHint">Рабочий ProductTile: обычный вид и витринный вариант, наведение меняет фото. Избранное переключается только в примере</p>
      <ul className={styles.tiles}>
        <ProductTile product={demoProduct} href="#ds-product-tile" favoriteControl={{ liked, onChange: setLiked }} />
        <ProductTile product={demoProduct} href="#ds-product-tile" presentation="storefront" favoriteControl={{ liked, onChange: setLiked }} />
      </ul>
      <p className="textHint">Обычная карточка и карточка витрины — изображения демонстрационные</p>
    </section>
    <section aria-labelledby="ds-favorite-card">
      <h3 id="ds-favorite-card">Карточка избранного</h3>
      <p className="textHint">Рабочая карточка с демонстрационным выбором размера и локальным переключением сердца</p>
      <ul className={styles.favoriteCards}>
        <FavoriteCard product={demoProduct} onRemove={() => {}} demo={{
          liked: favoriteLiked, onLikeChange: setFavoriteLiked, href: "#ds-favorite-card",
          variants: ["S", "M", "L"].map((size, index) => ({ id: index + 1, size, color: "", price: 5900, availableQuantity: index === 2 ? 0 : 1, sku: "" })),
          onAdd: variant => setFavoriteSize(variant.size),
        }} />
      </ul>
      <p className="textHint" role="status">{favoriteSize ? `Выбран размер ${favoriteSize} в примере` : "Выберите размер в примере"}</p>
    </section>
    <section aria-labelledby="ds-photo-placeholder">
      <h3 id="ds-photo-placeholder">Отсутствующее фото</h3>
      <p className="textHint">Общий плейсхолдер в размерах миниатюры и карточки</p>
      <div className={styles.photoExamples}>
        <div className={styles.photoSmall}><PhotoPlaceholder /></div>
        <div className={styles.photoCard}><PhotoPlaceholder /></div>
      </div>
    </section>
    <section aria-labelledby="ds-product-gallery">
      <h3 id="ds-product-gallery">Галерея фото</h3>
      <p className="textHint">Рабочая ProductImageCarousel: пролистывание, индикатор и состояние без фотографии</p>
      <div className={styles.galleries}>
        <ProductImageCarousel title="Пример товара" images={demoProduct.images} onImageClick={setImage} overlayIndicators />
        <ProductImageCarousel title="Пример без фото" images={[]} />
      </div>
      <p className="textHint" role="status">{image === null ? "Выберите фото в примере" : `Выбрано фото ${image + 1}`}</p>
    </section>
    <section aria-labelledby="ds-mobile-header">
      <h3 id="ds-mobile-header">Мобильная шапка панели</h3>
      <div className={styles.panel}><MobilePanelHeader title="Избранное" onBack={() => setPanelAction("Назад")} onClose={() => setPanelAction("Закрыть")} /></div>
      <p className="textHint" role="status">{panelAction ? `Нажато: ${panelAction}` : "Кнопки работают в демонстрационном режиме"}</p>
      <ProductShowcaseAction href="/catalog" label="Открыть каталог" />
    </section>
    <section aria-labelledby="ds-extra-states">
      <h3 id="ds-extra-states">Дополнительные состояния</h3>
      <p className="textHint">Встроенная загрузка, ошибка формы и направления сортировки</p>
      <div className={styles.inline}><Loader inline label="Загрузка примера" /><span>Загрузка</span></div>
      <FormError message="Не удалось сохранить изменения" />
      <div className={styles.inline}><span>Сортировка</span><SortIndicator /><SortIndicator direction="asc" /><SortIndicator direction="desc" /></div>
    </section>
  </div>;
}
