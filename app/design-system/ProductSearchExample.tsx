"use client";

import { useState } from "react";
import { ProductSearch, type SearchProduct } from "../components/ui/ProductSearch";

const examples: SearchProduct[] = [
  { id: 1, title: "Кроссовки для города", brand: "Пример бренда", minPrice: 5900 },
  { id: 2, title: "Кроссовки для бега", brand: "Пример бренда", minPrice: 7900 },
];
async function sampleSuggestions(query: string): Promise<SearchProduct[]> {
  return query.toLocaleLowerCase("ru").includes("крос") ? examples : [];
}

export function ProductSearchExample() {
  const [result, setResult] = useState("");
  return <div>
    <p className="label">Поиск товаров с подсказками</p>
    <ProductSearch loadSuggestions={sampleSuggestions} onSearch={query => setResult(`Поиск: ${query}`)}
      onProduct={href => setResult(`Выбран товар: ${href}`)} />
    <p>{result || "Введите «крос» для примера подсказок"}</p>
  </div>;
}
