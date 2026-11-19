"use client";

import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { ProductAdditionalInfo, ProductDetailsAccordion } from "../product/[id]/components/ProductDetailsAccordion";
import { ProductDetailsContent, type BriefFactsStyle } from "../product/[id]/components/ProductDetailsContent";
import type { Product } from "../product/[id]/lib/types";
import styles from "./ProductInfoCandidates.module.css";

type InfoKind = "facts" | "delivery" | "brand";
type Candidate = "accordion" | "segments" | "dialog";
type TitleStyle = "uppercase-16" | "uppercase-14" | "uppercase-14-medium";

const kinds = [
  { value: "facts", label: "О товаре" },
  { value: "delivery", label: "Доставка" },
  { value: "brand", label: "О бренде" },
] as const;

function InfoSelector({ product }: { product: Product }) {
  const [kind, setKind] = useState<InfoKind>("facts");
  return <div className={styles.selector}>
    <SegmentedControl ariaLabel="Раздел информации о товаре" value={kind} onChange={setKind} items={kinds} />
    <div key={kind} className={styles.content}><ProductAdditionalInfo kind={kind} product={product} brandHref={null} /></div>
  </div>;
}

export function ProductInfoCandidates({ product }: { product: Product }) {
  const [candidate, setCandidate] = useState<Candidate>("accordion");
  const [titleStyle, setTitleStyle] = useState<TitleStyle>("uppercase-14");
  const [briefFactsStyle, setBriefFactsStyle] = useState<Exclude<BriefFactsStyle, "current">>("subtle");
  const [dialogOpen, setDialogOpen] = useState(false);
  return <>
    <SegmentedControl ariaLabel="Вариант информации о товаре" value={candidate} onChange={setCandidate} items={[
      { value: "accordion", label: "Раскрытие" },
      { value: "segments", label: "Переключатель" },
      { value: "dialog", label: "Окно" },
    ]} />
    {candidate === "accordion" && <div className={styles.titleOptions}>
      <p>Заголовки раскрытия</p>
      <SegmentedControl ariaLabel="Заголовки раскрытия" value={titleStyle} onChange={setTitleStyle} items={[
        { value: "uppercase-16", label: "Спокойный" },
        { value: "uppercase-14", label: "Компактный" },
        { value: "uppercase-14-medium", label: "Чуть плотнее" },
      ]} />
    </div>}
    <div className={styles.titleOptions}>
      <p>Размеры и материал</p>
      <SegmentedControl ariaLabel="Оформление размеров и материала" value={briefFactsStyle} onChange={setBriefFactsStyle} items={[
        { value: "subtle", label: "Сдержанный" },
        { value: "readable", label: "Читаемый" },
        { value: "emphasis", label: "Выразительные подписи" },
      ]} />
    </div>
    <div className={styles.preview}>
      {candidate === "accordion" ? <ProductDetailsAccordion product={product} brandHref={null} disclosureVariant="flat" titleStyle={titleStyle} briefFactsStyle={briefFactsStyle} animated /> : <>
        <ProductDetailsContent description={product.description} composition={product.composition} details={product.details}
          category={product.category} audience={product.audience} view="brief" briefFactsStyle={briefFactsStyle} />
        {candidate === "segments" ? <InfoSelector product={product} /> : <Button type="button" variant="secondary" onClick={() => setDialogOpen(true)}>Подробнее о товаре</Button>}
      </>}
    </div>
    {dialogOpen && <Dialog title="Информация о товаре" className={styles.dialog} onClose={() => setDialogOpen(false)}>
      <InfoSelector product={product} />
    </Dialog>}
  </>;
}
