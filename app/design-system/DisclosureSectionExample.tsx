"use client";

import { useState } from "react";
import { DisclosureSection } from "../components/ui/DisclosureSection";
import { TextInput } from "../components/ui/TextInput";

export function DisclosureSectionExample() {
  const [opened, setOpened] = useState({ basic: true, delivery: false, product: false, shipping: false });
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  return <div style={{ maxWidth: 720 }}>
    <DisclosureSection title="Основные данные" summary={name ? name : "Название товара"}
      status={name.trim() ? "Заполнено" : "Нужно заполнить"} open={opened.basic}
      onOpenChange={open => setOpened(current => ({ ...current, basic: open }))}>
      <TextInput label="Название" value={name} onChange={event => setName(event.target.value)} />
    </DisclosureSection>
    <DisclosureSection title="Производство" summary={city ? city : "Город производства"}
      status={city.trim() ? "Заполнено" : "Необязательно"} open={opened.delivery}
      onOpenChange={open => setOpened(current => ({ ...current, delivery: open }))}>
      <TextInput label="Город производства" value={city} onChange={event => setCity(event.target.value)} />
    </DisclosureSection>
    <h3 style={{ margin: "32px 0 12px" }}>Без разделительных линий</h3>
    <DisclosureSection title="Подробнее о товаре" variant="plain" open={opened.product}
      onOpenChange={open => setOpened(current => ({ ...current, product: open }))}>
      <p>Состав, замеры и уход за изделием</p>
    </DisclosureSection>
    <DisclosureSection title="Доставка и оплата" variant="plain" open={opened.shipping}
      onOpenChange={open => setOpened(current => ({ ...current, shipping: open }))}>
      <p>Условия доставки и оплаты</p>
    </DisclosureSection>
  </div>;
}
