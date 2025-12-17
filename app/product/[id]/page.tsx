"use client";

import { use, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { getCartId, isAuthenticated } from "../../lib/auth";
import { useRouter } from "next/navigation";

type Variant = {
  id: number;
  price: number;
};

type Product = {
  id: number;
  title: string;
  description: string;
  brand: string;
  category: string;
  images: string[];
  variants: Variant[];
};

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ✅ распаковываем params
  const { id } = use(params);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const router = useRouter();
  const cartId = getCartId();

  useEffect(() => {
    fetch(`http://localhost:9696/api/products/${id}`)
      .then((r) => r.json())
      .then((data: Product) => {
        setProduct(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div style={{ padding: 24 }}>Загрузка товара...</div>;
  }

  if (!product) {
    return <div style={{ padding: 24 }}>Товар не найден</div>;
  }
  const safeProduct = product;

  const prices = safeProduct.variants.map((v) => v.price);
  const minPrice = Math.min(...prices);
  const image = safeProduct.images[0];

  async function addToCart() {
    if (!isAuthenticated()) {
      router.push("/auth/login");
      return;
    }

    if (!cartId) return;

    const variantId = safeProduct.variants[0].id;

    try {
      setAdding(true);

      await apiFetch(
        `http://localhost:9696/api/cart/add?cartId=${cartId}&variantId=${variantId}&qty=1`,
        { method: "POST" }
      );

      alert("Товар добавлен в корзину");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>{safeProduct.brand} {safeProduct.title}</h1>

      {/* IMAGE */}
      <div
        style={{
          width: 400,
          height: 400,
          backgroundColor: "#f3f3f3",
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        {image && (
          <img
            src={image}
            alt={safeProduct.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
      </div>

      {/* PRICE */}
      <div
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginBottom: 16,
        }}
      >
        от {minPrice.toLocaleString()} ₽
      </div>

      {/* ADD TO CART */}
      <button
        onClick={addToCart}
        disabled={adding}
        style={{
          padding: "12px 24px",
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: adding ? "default" : "pointer",
          opacity: adding ? 0.6 : 1,
          marginBottom: 24,
        }}
      >
        {adding ? "Добавляем…" : "Добавить в корзину"}
      </button>

      {/* DESCRIPTION */}
      <p>{safeProduct.description}</p>
    </div>
  );
}
