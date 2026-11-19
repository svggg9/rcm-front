"use client";

import { useRef, useState } from "react";
import { CartItemRow } from "../cart/components/CartItemRow";
import { CartClearAction } from "../cart/components/CartClearAction";
import { Button } from "../components/ui/Button";
import type { CartItem } from "../cart/lib/types";

const product: CartItem = {
  productId: 90001, variantId: 90001, title: "Сумка с короткими ручками", brand: "РЦМАРКЕТ",
  size: "", color: "Синий", price: 6900, quantity: 1, imageUrl: null,
};

/** The row and all actions use local example state; no cart or favorites are changed. */
export function CartItemExample() {
  const [shown, setShown] = useState(true);
  const [liked, setLiked] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const restoreClearRef = useRef<HTMLButtonElement>(null);
  return <section aria-labelledby="ds-cart-item">
    <h3 id="ds-cart-item">Товар в корзине</h3>
    <p className="textHint">Рабочая строка на условных данных; удаление и избранное действуют только в примере</p>
    <div style={{ maxWidth: 720 }}>
      <CartClearAction count={shown ? quantity : 0} disabled={!shown} busy={false} error={null} fallbackFocusRef={restoreClearRef}
        onConfirm={async () => { setShown(false); return true; }} />
      {shown ? <CartItemRow item={{ ...product, quantity }} demoFavorite={{ liked, onChange: setLiked }}
        onChangeQty={(_variantId, value) => setQuantity(value)} onRemove={() => setShown(false)} />
        : <p role="status">Товар удалён в примере</p>}
      {!shown && <Button ref={restoreClearRef} type="button" variant="secondary" onClick={() => { setQuantity(1); setShown(true); }}>Восстановить пример</Button>}
    </div>
  </section>;
}
