import { NumberField } from "./NumberField";
import { SectionHeader } from "./SectionHeader";
import { Icon } from "../../../../../components/ui/Icon";
import styles from "../ProductEditPage.module.css";

type ValidationErrors = {
  packageWidthCm?: boolean;
  packageHeightCm?: boolean;
  packageLengthCm?: boolean;
  packageWeightKg?: boolean;
};

type Props = {
  validationErrors: ValidationErrors;
  packageWidthCm: number | "";
  packageHeightCm: number | "";
  packageLengthCm: number | "";
  packageWeightKg: number | "";
  onPackageWidthCmChange: (value: number | "") => void;
  onPackageHeightCmChange: (value: number | "") => void;
  onPackageLengthCmChange: (value: number | "") => void;
  onPackageWeightKgChange: (value: number | "") => void;
};

function formatWeight(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: value < 1 ? 3 : 2,
  }).format(value);
}

export function ProductShippingCard({
  validationErrors,
  packageWidthCm,
  packageHeightCm,
  packageLengthCm,
  packageWeightKg,
  onPackageWidthCmChange,
  onPackageHeightCmChange,
  onPackageLengthCmChange,
  onPackageWeightKgChange,
}: Props) {
  const widthCm = Number(packageWidthCm);
  const heightCm = Number(packageHeightCm);
  const lengthCm = Number(packageLengthCm);
  const actualWeightKg = Number(packageWeightKg);
  const dimensionsReady =
    widthCm > 0 && heightCm > 0 && lengthCm > 0 && actualWeightKg > 0;
  const volumetricWeightKg = dimensionsReady
    ? (widthCm * heightCm * lengthCm) / 5000
    : null;
  const chargedWeightKg = volumetricWeightKg === null
    ? null
    : Math.max(actualWeightKg, volumetricWeightKg);
  const volumetricIsHigher =
    volumetricWeightKg !== null && volumetricWeightKg > actualWeightKg;

  return (
    <section className={styles.card}>
      <SectionHeader
        title="Вес и габариты с упаковкой"
        hint="Укажите размер и вес окончательно упакованной посылки"
      />

      <div className={styles.formGrid}>
        <NumberField
          label="Длина, см"
          value={packageLengthCm}
          invalid={validationErrors.packageLengthCm}
          onChange={onPackageLengthCmChange}
        />

        <NumberField
          label="Ширина, см"
          value={packageWidthCm}
          invalid={validationErrors.packageWidthCm}
          onChange={onPackageWidthCmChange}
        />

        <NumberField
          label="Высота, см"
          value={packageHeightCm}
          invalid={validationErrors.packageHeightCm}
          onChange={onPackageHeightCmChange}
        />

        <NumberField
          label="Вес, кг"
          value={packageWeightKg}
          decimal
          invalid={validationErrors.packageWeightKg}
          onChange={onPackageWeightKgChange}
        />
      </div>

      <div className={styles.shippingGuide}>
        <div className={styles.shippingGuideIntro}>
          <Icon name="package" size={18} />
          <div>
            <strong>Измеряйте внешнюю упаковку</strong>
            <span>СДЭК сравнивает фактический вес с объёмным: длина × ширина × высота / 5000</span>
            <span className={styles.shippingGuideExample}>
              Например, коробка с кроссовками 32 × 22 × 13 см весит 1 кг. Объёмный вес — 1,83 кг, поэтому СДЭК рассчитает доставку по объёмному весу, а не по фактическому
            </span>
          </div>
        </div>

        <div className={styles.shippingMeasureGuide}>
          <div>
            <strong>Одежда и текстиль</strong>
            <span>Сложите товар так, как отправите покупателю, и измерьте упаковку</span>
          </div>
          <div>
            <strong>Коробки</strong>
            <span>Укажите внешнюю длину, ширину и высоту коробки</span>
          </div>
          <div>
            <strong>Нестандартная форма</strong>
            <span>Измерьте максимальное значение каждой стороны</span>
          </div>
          <div>
            <strong>Несколько частей</strong>
            <span>Сложите их максимально компактно и укажите общие габариты</span>
          </div>
        </div>

        {dimensionsReady && volumetricWeightKg !== null && chargedWeightKg !== null ? (
          <>
            <div className={styles.shippingWeightGrid}>
              <div className={styles.shippingWeightMetric}>
                <span>Фактический вес</span>
                <strong>{formatWeight(actualWeightKg)} кг</strong>
              </div>
              <div className={styles.shippingWeightMetric}>
                <span>Объёмный вес</span>
                <strong>{formatWeight(volumetricWeightKg)} кг</strong>
              </div>
              <div className={styles.shippingWeightMetric}>
                <span>Расчётный вес СДЭК</span>
                <strong>{formatWeight(chargedWeightKg)} кг</strong>
              </div>
            </div>

            {volumetricIsHigher ? (
              <div className={styles.shippingWeightWarning}>
                <Icon name="alert" size={17} />
                <span>Объёмный вес выше фактического, более компактная упаковка снизит стоимость доставки</span>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.shippingWeightHint}>
            <Icon name="info" size={17} />
            <span>Заполните четыре поля, чтобы увидеть расчётный вес СДЭК</span>
          </div>
        )}
      </div>
    </section>
  );
}
