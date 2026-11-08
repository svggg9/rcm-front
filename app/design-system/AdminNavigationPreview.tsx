"use client";

import { useState } from "react";
import { CabinetSidebar } from "../components/ui/CabinetSidebar";

const sections = ["Обзор", "Товары", "Заказы", "Продавцы", "Возвраты", "Финансы", "Доставка", "Обращения"];
export function AdminNavigationPreview() {
  const [active, setActive] = useState("Финансы");
  return <div><CabinetSidebar title="Админка" mobileInline ariaLabel="Пример навигации админки"
    items={sections.map((label,index) => ({ label, href:`#admin-navigation-${index}`, active:active===label }))}
    onNavigate={href=>setActive(sections[Number(href.split("-").at(-1))] || sections[0])} />
    <p className="textHint">На телефоне пункты идут по ширине текста, активный раздел остаётся видимым</p>
  </div>;
}
