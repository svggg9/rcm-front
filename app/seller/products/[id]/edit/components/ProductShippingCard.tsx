import { NumberField } from "./NumberField";
import { Banner } from "../../../../../components/ui/Banner";
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
    <section id="product-shipping" className={styles.card} aria-label="Упаковка товара">
      <div className={styles.packageFields}>
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
        <p className="textHint">Укажите вес и размеры товара во внешней упаковке</p>
        <details className={styles.optionalSection}><summary>Как СДЭК рассчитывает вес</summary>
          <p className={styles.shippingFormula}>Длина × ширина × высота / 5000</p>
          <p className="textHint">Размеры — в сантиметрах, результат — в килограммах. Для расчёта доставки СДЭК берёт больший из фактического и объёмного веса.</p>
        </details>

        {dimensionsReady && volumetricWeightKg !== null && chargedWeightKg !== null ? (
          <>
            <dl className={styles.shippingWeightGrid}>
              <div className={styles.shippingWeightMetric}>
                <dt>Фактический вес</dt>
                <dd>{formatWeight(actualWeightKg)} кг</dd>
              </div>
              <div className={styles.shippingWeightMetric}>
                <dt>Объёмный вес</dt>
                <dd>{formatWeight(volumetricWeightKg)} кг</dd>
              </div>
              <div className={styles.shippingWeightMetric}>
                <dt>Для расчёта доставки</dt>
                <dd>{formatWeight(chargedWeightKg)} кг</dd>
              </div>
            </dl>

            {volumetricIsHigher ? (
              <Banner tone="warning">
                Объёмный вес выше фактического — попробуйте более компактную упаковку
              </Banner>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
