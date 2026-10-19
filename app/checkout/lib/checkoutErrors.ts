export class CheckoutActionError extends Error {}

const messages: Record<string, string> = {
  order_amount_limit_exceeded: "Сумма заказа превышает лимит оплаты 50 000 ₽ — уменьшите количество товаров",
  delivery_quote_expired: "Срок расчёта доставки истёк — рассчитываем заново",
  delivery_quote_stale: "Стоимость доставки изменилась — рассчитываем заново",
  delivery_quote_invalid: "Не удалось подтвердить расчёт доставки — попробуйте ещё раз",
  "Seller delivery origin is not configured": "Продавец ещё не настроил доставку — обратитесь в поддержку",
  "Order group cannot contain more than 3 sellers": "В одном заказе могут быть товары не больше трёх продавцов",
  "Cart is empty": "Корзина пуста — добавьте товары",
};

export async function readCheckoutFailure(response: Response, fallback: string): Promise<{ message: string; code: string }> {
  const text = await response.text().catch(() => "");
  let code = "";
  try {
    const data: unknown = JSON.parse(text);
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") code = data.message;
  } catch { /* Internal text/HTML is never UI copy. */ }
  return { message: messages[code] ?? fallback, code };
}
export async function readCheckoutError(response: Response, fallback: string): Promise<string> {
  return (await readCheckoutFailure(response, fallback)).message;
}
