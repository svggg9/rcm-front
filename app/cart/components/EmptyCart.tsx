import { EmptyState } from "../../components/ui/EmptyState";

export function EmptyCart() {
  return (
    <EmptyState
      icon="cart"
      tone="gold"
      title="Корзина пуста"
      text="Добавьте товары, чтобы оформить заказ"
    />
  );
}
