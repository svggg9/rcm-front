"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiFetch, API_URL } from "../lib/api";
import { ensureCartId, getToken } from "../lib/auth";
import { emitCartChanged } from "../lib/cartEvents";
import { getGuestFavoriteIds } from "../lib/favorites";
import { Loader } from "../components/ui/Loader";
import { addVariantToCart } from "../product/[id]/lib/productPageApi";

import { WishlistProductCard } from "./components/WishlistProductCard";

import styles from "./Wishlist.module.css";

type ProductApiVariant = {
  id: number;
  size: string;
  color: string;
  price: number;
  availableQuantity: number | null;
};

type ProductApi = {
  id: number;
  title: string;
  brand: string | null;
  category: string | null;
  images: string[];
  minPrice?: number;
  variants?: ProductApiVariant[];
};

type WishlistProduct = {
  id: number;
  title: string;
  brand: string | null;
  images: string[];
  minPrice: number;
  variants: ProductApiVariant[];
};

function resolveMinPrice(product: ProductApi): number {
  if (typeof product.minPrice === "number") {
    return product.minPrice;
  }

  const prices = product.variants
    ?.map((variant) => variant.price)
    .filter((price): price is number => typeof price === "number");

  return prices?.length ? Math.min(...prices) : 0;
}

function toWishlistProduct(product: ProductApi): WishlistProduct {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand ?? null,
    images: Array.isArray(product.images) ? product.images : [],
    minPrice: resolveMinPrice(product),
    variants: Array.isArray(product.variants) ? product.variants : [],
  };
}

export default function WishlistPage() {
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadWishlist() {
    setLoading(true);

    try {
      const token = getToken();

      if (token) {
        const response = await apiFetch(`${API_URL}/api/favorites`);

        if (!response.ok) {
          throw new Error("Не удалось загрузить wishlist");
        }

        const data: ProductApi[] = await response.json();
        setProducts(Array.isArray(data) ? data.map(toWishlistProduct) : []);
        return;
      }

      const guestIds = getGuestFavoriteIds();

      if (!guestIds.length) {
        setProducts([]);
        return;
      }

      const response = await apiFetch(`${API_URL}/api/products`);

      if (!response.ok) {
        throw new Error("Не удалось загрузить товары");
      }

      const data: ProductApi[] = await response.json();
      const idSet = new Set(guestIds);

      const filtered = (Array.isArray(data) ? data : [])
        .filter((product) => idSet.has(product.id))
        .sort((a, b) => guestIds.indexOf(a.id) - guestIds.indexOf(b.id))
        .map(toWishlistProduct);

      setProducts(filtered);
    } catch (error) {
      setProducts([]);
      toast.error(
        error instanceof Error ? error.message : "Не удалось загрузить wishlist"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWishlist();

    function handleAuthChanged() {
      void loadWishlist();
    }

    window.addEventListener("auth-changed", handleAuthChanged);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  async function handleRemove(productId: number) {
    try {
      const response = await apiFetch(`${API_URL}/api/favorites/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok && getToken()) {
        throw new Error("Не удалось удалить из избранного");
      }

      setProducts((current) =>
        current.filter((product) => product.id !== productId)
      );

      window.dispatchEvent(new Event("favorites-changed"));
      toast("Удалено из избранного");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось удалить товар"
      );
    }
  }

  async function handleAddToCart(variantId: number) {
    try {
      const cartId = await ensureCartId();

      if (!cartId) {
        toast.error("Не удалось создать корзину");
        return;
      }

      await addVariantToCart({
        cartId,
        variantId,
        qty: 1,
      });

      emitCartChanged();
      toast.success("Товар добавлен в корзину");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось добавить в корзину"
      );
    }
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Wishlist</h1>
          <p className={styles.subtitle}>Всего товаров: {products.length}</p>
        </header>

        {loading ? (
          <Loader label="Загружаем wishlist" />
        ) : products.length === 0 ? (
          <div className="emptyState">
            <div className="emptyStateTitle">Wishlist пока пуст</div>
            <div className="emptyStateText">
              Сохраняйте товары, чтобы вернуться к ним позже.
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            {products.map((product) => (
              <WishlistProductCard
                key={product.id}
                product={product}
                onRemove={handleRemove}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}