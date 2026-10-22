import { SectionLoader } from "./components/ui/SectionLoader";

export default function Loading() {
  return <div className="pageContainer"><SectionLoader label="Загрузка страницы" fullPage /></div>;
}
