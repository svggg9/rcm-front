"use client";

import { useState } from "react";
import { MobilePanelHeader } from "../components/BuyerNavigation/MobilePanelHeader";
import { ProductImageCarousel } from "../components/ProductImageCarousel/ProductImageCarousel";
import { ProductShowcaseAction } from "../components/ProductShowcase/ProductShowcaseAction";
import { ProductTile } from "../components/ProductTile/ProductTile";
import { FormError } from "../components/ui/FormError";
import { Loader } from "../components/ui/Loader";
import { SortIndicator } from "../components/ui/SortIndicator";
import styles from "./StorefrontPatterns.module.css";

const demoProduct = { id: 0, title: "Футболка · пример", brand: "РЦМАРКЕТ", minPrice: 5900,
  images: ["/examples/demo-shirt-front.svg", "/examples/demo-shirt-back.svg"] };

export function StorefrontPatterns() {
  const [liked, setLiked] = useState(false);
  const [panelAction, setPanelAction] = useState("");
  const [image, setImage] = useState<number | null>(null);
  return <div className={styles.patterns}>
    <section aria-labelledby="ds-product-tile">
      <h3 id="ds-product-tile">Карточка товара</h3>
      <p className="textHint">Рабочий ProductTile: обычный вид и витринный вариант, наведение меняет фото. Избранное переключается только в примере</p>
      <ul className={styles.tiles}>
        <ProductTile product={demoProduct} href="#ds-product-tile" favoriteControl={{ liked, onChange: setLiked }} />
        <ProductTile product={demoProduct} href="#ds-product-tile" presentation="storefront" favoriteControl={{ liked, onChange: setLiked }} />
      </ul>
      <p className="textHint">Обычная карточка и карточка витрины · изображения демонстрационные</p>
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
