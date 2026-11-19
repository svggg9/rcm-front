import type { ProductDetails } from "../../../lib/productDetails";

/** Only summarize explicitly labelled dimensions; all original values remain in the details. */
export function productBriefFacts(composition?: string | null, details?: ProductDetails | null) {
  const dimensions = new Map<string, string[]>();
  for (const line of (details?.measurements ?? "").split(/\r?\n/)) {
    const labelled = line.trim().match(/^(ширина|высота|глубина)\s*:/i);
    if (!labelled) continue;
    const key = labelled[1].toLowerCase();
    const match = line.trim().match(/^(?:ширина|высота|глубина)\s*:\s*(\d+(?:[.,]\d+)?)\s*(см|мм)\s*$/i);
    dimensions.set(key, [...(dimensions.get(key) ?? []), match ? `${match[1]} ${match[2].toLowerCase()}` : ""]);
  }
  const values = ["ширина", "высота", "глубина"].map(key => dimensions.get(key));
  let measurements: string | null = null;
  if (values.every(value => value?.length === 1 && value[0])) {
    const entries = values.map(value => value![0]);
    const units = entries.map(entry => entry.slice(entry.lastIndexOf(" ") + 1));
    measurements = units.every(unit => unit === units[0])
      ? `${entries.map(entry => entry.slice(0, entry.lastIndexOf(" "))).join(" × ")} ${units[0]}`
      : entries.join(" × ");
  }

  const outerMaterials = (composition ?? "").split(/\r?\n/)
    .map(line => line.trim().match(/^наружный материал\s*:\s*(.{1,80})$/i)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));
  const material = outerMaterials.length === 1 ? outerMaterials[0] : null;
  return { measurements, material };
}
