import { NumberField } from "./NumberField";
import { SectionHeader } from "./SectionHeader";
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
  return (
    <section className={styles.card}>
      <SectionHeader
        title="Вес и габариты с упаковкой"
        hint="Понадобится для расчета доставки."
      />

      <div className={styles.formGrid}>
        <NumberField
          label="Ширина, см"
          value={packageWidthCm}
          decimal
          invalid={validationErrors.packageWidthCm}
          onChange={onPackageWidthCmChange}
        />

        <NumberField
          label="Высота, см"
          value={packageHeightCm}
          decimal
          invalid={validationErrors.packageHeightCm}
          onChange={onPackageHeightCmChange}
        />

        <NumberField
          label="Длина, см"
          value={packageLengthCm}
          decimal
          invalid={validationErrors.packageLengthCm}
          onChange={onPackageLengthCmChange}
        />

        <NumberField
          label="Вес, кг"
          value={packageWeightKg}
          decimal
          invalid={validationErrors.packageWeightKg}
          onChange={onPackageWeightKgChange}
        />
      </div>
    </section>
  );
}
