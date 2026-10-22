/* eslint-disable @typescript-eslint/no-require-imports -- Isolated checkout transport/handler regression; no DB, SMTP or payment provider. */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const testModule = { exports: {} };
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => {
    if (!(name in imports)) throw Error("Unexpected import " + name); return imports[name];
  }); return testModule.exports;
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const match = find(child, predicate); if (match) return match; }
  return null;
}
function storage() { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) }; }
function hooks() {
  let cursor = 0; const values = []; const effects = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === "function" ? initial() : initial;
      return [values[i], next => { values[i] = typeof next === "function" ? next(values[i]) : next; }]; },
    useRef(initial) { const i = cursor++; if (!(i in values)) values[i] = { current: initial }; return values[i]; },
    useMemo(fn) { cursor++; return fn(); },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn, deps) { const i = cursor++; const before = values[i];
      if (!before || !deps || deps.some((value, index) => !Object.is(value, before[index]))) effects.push(fn);
      values[i] = deps; },
  };
  return { react, reset() { cursor = 0; values.length = 0; effects.length = 0; }, render(fn) { cursor = 0; return fn(); }, async effects() { for (const fn of effects.splice(0)) fn(); await new Promise(resolve => setImmediate(resolve)); } };
}
async function main() {
  const redirects = load("app/lib/paymentRedirect.ts", {});
  for (const value of ["https://pay.tbank-online.com/test", "http://localhost:3000/mock-pay?orderId=625", "http://127.0.0.1:3000/mock-pay"]) {
    assert.equal(redirects.paymentConfirmationUrl(value), value);
  }
  for (const value of [null, "", "?orderId=625&externalPaymentId=mock", "/mock-pay", "javascript:alert(1)", "http://bank.example/pay", "https://user:password@bank.example/pay", "https://"]) {
    assert.equal(redirects.paymentConfirmationUrl(value), null, "Invalid confirmation URLs must not turn into cart/account navigation");
  }
  const checkoutListeners = new Map();
  global.window = { setTimeout: () => 1, clearTimeout() {}, location: { href: "" },
    addEventListener: (event, fn) => checkoutListeners.set(event, fn), removeEventListener: event => checkoutListeners.delete(event) };
  global.sessionStorage = storage(); global.localStorage = storage();
  global.requestAnimationFrame = fn => { fn(); return 1; };
  const pending = load("app/checkout/lib/pendingPayment.ts", {});
  pending.savePendingPaymentOrderId("user_check", 123);
  pending.clearSucceededPendingPayment("user_check", 124, "SUCCEEDED");
  assert.equal(pending.loadPendingPaymentOrderId("user_check"), 123);
  pending.clearSucceededPendingPayment("user_check", 123, "PENDING");
  assert.equal(pending.loadPendingPaymentOrderId("user_check"), 123);
  pending.clearSucceededPendingPayment("user_check", 123, "SUCCEEDED");
  assert.equal(pending.loadPendingPaymentOrderId("user_check"), null);
  const availableStorage = sessionStorage;
  global.sessionStorage = { getItem() { throw Error("storage disabled"); }, setItem() { throw Error("storage disabled"); } };
  assert.doesNotThrow(() => pending.savePendingPaymentOrderId("user_check", 123));
  assert.equal(pending.loadPendingPaymentOrderId("user_check"), null);
  assert.doesNotThrow(() => pending.clearSucceededPendingPayment("user_check", 123, "SUCCEEDED"));
  global.sessionStorage = availableStorage;
  const errors = load("app/checkout/lib/checkoutErrors.ts", {});
  const privateFailure = await errors.readCheckoutFailure(Response.json({ message: "private SQL /api/path" }, { status: 500 }), "Не удалось рассчитать доставку");
  assert.equal(privateFailure.message, "Не удалось рассчитать доставку");
  const stale = await errors.readCheckoutFailure(Response.json({ message: "delivery_quote_stale" }, { status: 409 }), "fallback");
  assert.equal(stale.code, "delivery_quote_stale"); assert(!stale.message.includes("delivery_quote"));
  const cart = { cartId: "user_fixture", items: [{ productId: 1, variantId: 10, quantity: 2, price: 1000, title: "Товар", color: "Белый", size: "", imageUrl: null }] };
  pending.savePendingPaymentOrderId(cart.cartId, 888);
  let liveCart = cart, cartUpdating = false;
  const cartMutationRef = { current: false }, submissionLocks = [];
  const onSubmitBusyChange = busy => submissionLocks.push(busy);
  const calls = [], orderNavigation = []; let holdQuote = false, quoteResolve, rejectStale = false, createdOrders = 0, paymentUrl = "";
  let resumedPaymentStatus = "PENDING";
  const defaultProfile = { email: "fixture@example.test", firstName: "Тест", lastName: "Покупатель", displayName: "Тест Покупатель", phone: "+79990000000" };
  let currentProfile = defaultProfile;
  const fixtureRouter = { push() {}, replace: url => orderNavigation.push(url) };
  let holdPayment = false, resolvePayment;
  let loseCheckoutResponse = false, replayLostRequest = false;
  const quote = { quoteToken: "quote", checkoutToken: "checkout", externalOfferId: "offer", priceAmount: 450, currency: "RUB", expiresAt: new Date(Date.now() + 900000).toISOString(), sellerDeliveryCosts: [{ sellerId: 1, deliveryCostAmount: 450 }] };
  const h = hooks();
  const { CheckoutPageClient } = load("app/checkout/CheckoutPageClient.tsx", {
    react: h.react, "react/jsx-runtime": jsx,
    "../lib/useFieldValidation": load("app/lib/useFieldValidation.ts", { react: h.react }), "next/navigation": { useRouter: () => fixtureRouter },
    "../lib/api": { API_URL: "http://fixture", apiFetch: async (url, options = {}) => {
      calls.push({ url, body: options.body ? JSON.parse(options.body) : null });
      if (url.endsWith("/api/profile")) return Response.json(currentProfile);
      if (url.endsWith("/orders/777/group")) return Response.json([{ id: 777, orderGroupId: "fixture", paymentStatus: resumedPaymentStatus === "SUCCEEDED" ? "PAID" : "PENDING", paymentAllowed: true,
        subtotalAmount: 2000, deliveryAmount: 450, recipientName: "Тест Покупатель", recipientPhone: "+79990000000", deliveryAddress: "ул. Тверская, 12", pickupPointId: "44-1" }]);
      if (url.endsWith("/payments/order/777/group-last")) return Response.json({ status: resumedPaymentStatus, externalId: "pay777" });
      if (url.endsWith("/payments/pay777/sync")) return Response.json({ status: resumedPaymentStatus });
      if (url.endsWith("/pickup-points/search")) return Response.json({ points: [{ id: "44-1", fullAddress: "ул. Тверская, 12", cityCode: 44 }] });
      if (url.endsWith("/seller-group-quotes")) return holdQuote ? new Promise(resolve => { quoteResolve = () => resolve(Response.json(quote)); }) : Response.json(quote);
      if (url.includes("/orders/checkout")) {
        if (rejectStale) { rejectStale = false; return Response.json({ message: "delivery_quote_stale" }, { status: 409 }); }
        if (replayLostRequest) replayLostRequest = false;
        else {
          createdOrders++;
          if (loseCheckoutResponse) { loseCheckoutResponse = false; replayLostRequest = true; throw new TypeError("lost response after commit"); }
        }
        return Response.json([{ id: 777, orderGroupId: "fixture" }]);
      }
      if (url.includes("/payments/order/777/group")) return holdPayment
        ? new Promise(resolve => { resolvePayment = () => resolve(Response.json({ confirmationUrl: paymentUrl })); })
        : paymentUrl ? Response.json({ confirmationUrl: paymentUrl }) : Response.json({ message: "private provider detail" }, { status: 503 });
      return Response.json([]);
    } },
    "../lib/paymentRedirect": redirects,
    "./lib/pendingPayment": pending,
    "../lib/auth": { rememberUserCartId() {} }, "../lib/cartAuthority": { loadResolvedCart: async () => cart },
    "../lib/cartEvents": { emitCartChanged() {} }, "../lib/formValidation": { scrollToFirstValidationError() {} },
    "./components/CheckoutContactSection": { CheckoutContactSection: "Contact" },
    "./components/CheckoutDeliverySection": { CheckoutDeliverySection: "Delivery" },
    "./components/CheckoutFlow": { CheckoutFlow: "Flow" }, "./components/CheckoutSummary": { CheckoutSummary: "Summary" },
    "./lib/checkoutErrors": errors, "@/app/components/ui/toast": { toast: { error() {}, info() {}, message() {} } },
    "../components/ui/Loader": { Loader: "Loader" }, "../components/ui/EmptyState": { EmptyState: "EmptyState" },
    "../lib/validation": { isValidPhone: value => /[0-9]{10}/.test(value) },
    "./lib/checkoutDraft": { loadCheckoutDraft: () => ({ email: "old@example.test", fullName: "Старый Получатель", phone: "+79990000001", deliveryMethod: "PICKUP", selectedAddressId: "44-1", selectedCityCode: 44, selectedCityName: "Москва", countryCode: "RU", apartment: "", floor: "", intercom: "", comment: "Старое пожелание из черновика", fittingMode: "WITHOUT_FITTING", paymentMethod: "CARD", deliveryAddress: "" }), saveCheckoutDraft() {}, clearCheckoutDraft() {} },
    "./lib/checkoutPrefill": load("app/checkout/lib/checkoutPrefill.ts", {}), "./Checkout.module.css": { default: {} },
  });
  // CheckoutPageClient is a small wrapper; hook rendering belongs to its child controller.
  function controller() { const wrapper = CheckoutPageClient({ initialMe: null, initialCart: null, embedded: true,
    cartSnapshot: liveCart, cartUpdating, cartMutationRef, onSubmitBusyChange }); return h.render(() => wrapper.type(wrapper.props)); }
  let view; for (let i = 0; i < 6; i++) { view = controller(); await h.effects(); }
  view = controller(); let flow = find(view, node => node.type === "Flow"); assert(flow);
  assert.equal(flow.props.recipient, "Тест Покупатель", "Current profile must replace legacy draft contacts");
  assert.equal(flow.props.phone, "+79990000000");
  flow.props.contact.props.onFullNameChange("Другой Получатель");
  flow.props.contact.props.onPhoneChange("+79990000003");
  view = controller(); await h.effects();
  await checkoutListeners.get("focus")();
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.recipient, "Другой Получатель", "An unchanged profile must preserve manual edits in the active checkout");
  assert.equal(flow.props.phone, "+79990000003");
  currentProfile = { ...defaultProfile, firstName: "Актуальный", phone: "+79990000004" };
  await checkoutListeners.get("focus")();
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.recipient, "Актуальный Покупатель"); assert.equal(flow.props.phone, "+79990000004");
  currentProfile = { ...defaultProfile, firstName: null, lastName: null, phone: null };
  await checkoutListeners.get("focus")();
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.recipient, ""); assert.equal(flow.props.phone, "", "Cleared profile contacts must not resurrect a draft or displayName");
  currentProfile = defaultProfile;
  await checkoutListeners.get("focus")();
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert(calls.filter(call => call.url.endsWith("/api/profile")).every(call => !call.body), "Editing a recipient must never save the profile");
  assert.equal(flow.props.pickupLabel, "ул. Тверская, 12");
  assert.equal(flow.props.pendingPayment, undefined, "A previous order cannot replace the new checkout");
  assert.equal(calls.filter(call => call.url.includes("group-last")).length, 0, "New checkout does not depend on an old payment check");
  assert.equal(await flow.props.onContinue(), true);
  assert.equal(calls.filter(call => call.url.includes("/orders/checkout")).length, 0, "Continuing delivery must not create an order");
  view = controller(); flow = find(view, node => node.type === "Flow");
  cartMutationRef.current = true; cartUpdating = true;
  await flow.props.onSubmit();
  assert.equal(calls.filter(call => call.url.includes("/orders/checkout")).length, 0, "A cart mutation blocks even a handler captured before its rerender");
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert(flow.props.disabled); assert.equal(flow.props.deliveryCalculated, false);
  assert.equal(await flow.props.onContinue(), false); await h.effects();
  liveCart = { ...cart, items: cart.items.map(item => ({ ...item, quantity: 1 })) };
  cartMutationRef.current = false; cartUpdating = false;
  view = controller(); flow = find(view, node => node.type === "Flow"); await h.effects();
  assert.equal(flow.props.subtotal, 1000); assert.equal(flow.props.cityName, "Москва");
  assert.equal(flow.props.pickupLabel, "ул. Тверская, 12"); assert.equal(flow.props.recipient, "Тест Покупатель");
  holdQuote = true;
  const obsoleteQuote = flow.props.onContinue(); const resolveObsoleteQuote = quoteResolve;
  cartMutationRef.current = true; cartUpdating = true;
  controller(); await h.effects();
  liveCart = { ...cart, items: cart.items.map(item => ({ ...item, quantity: 3 })) };
  cartMutationRef.current = false; cartUpdating = false;
  controller(); await h.effects();
  resolveObsoleteQuote(); assert.equal(await obsoleteQuote, false, "An outdated delivery response cannot advance checkout after a cart edit");
  holdQuote = false;
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.subtotal, 3000); assert.equal(flow.props.deliveryCalculated, false);
  assert.equal(await flow.props.onContinue(), true);
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.deliveryCalculated, true, "The new cart gets a new confirmed delivery quote");
  const delivery = flow.props.delivery;
  delivery.props.onPickerOpen(); delivery.props.onCitySelect({ code: 137, fullName: "Санкт-Петербург", countryCode: "RU" });
  view = controller(); flow = find(view, node => node.type === "Flow"); flow.props.delivery.props.onPickerCancel();
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.cityName, "Москва"); assert.equal(flow.props.pickupLabel, "ул. Тверская, 12", "Cancel restores committed city and point");
  holdQuote = true;
  const first = flow.props.onSubmit(); const second = flow.props.onSubmit();
  assert.equal(submissionLocks.at(-1), true, "Cart controls lock synchronously while the order is being created");
  assert.equal(calls.filter(call => call.url.includes("/orders/checkout")).length, 0);
  assert(quoteResolve, "Final submission refreshes the invalidated quote");
  quoteResolve(); await Promise.all([first, second]);
  assert.equal(submissionLocks.at(-1), true, "Checkout stays locked while navigating to the committed order after payment failure");
  assert.equal(orderNavigation.at(-1), "/account?tab=orders&orderId=777");
  assert.equal(calls.filter(call => call.url.includes("/orders/checkout")).length, 1, "Double click during quote refresh creates one order");
  const orderCall = calls.find(call => call.url.includes("/orders/checkout"));
  assert.equal(orderCall.body.deliveryQuoteToken, "checkout"); assert.equal(orderCall.body.deliveryPriceAmount, 450);
  assert.equal(orderCall.body.sellerDeliveryCosts[0].sellerId, 1);
  assert(!Object.hasOwn(orderCall.body, "comment"), "Removed wishes must not leak from a legacy draft into an order");
  assert(calls.filter(call => call.url.endsWith("/seller-group-quotes")).every(call => !Object.hasOwn(call.body.quote, "comment")), "Delivery quotes must omit legacy wishes");
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.pendingPayment, undefined);
  await flow.props.onSubmit();
  assert.equal(calls.filter(call => call.url.includes("/orders/checkout")).length, 1, "Navigation after payment failure must not create another order");
  assert.equal(calls.filter(call => call.url.includes("/payments/order/777/group")).length, 1);
  paymentUrl = "";
  // A fresh checkout controller belongs to the next cart, even while the
  // previous order remains unpaid and its compatibility hint is retained.
  h.reset();
  for (let i = 0; i < 6; i++) { view = controller(); await h.effects(); }
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.pendingPayment, undefined);
  holdQuote = false; rejectStale = true;
  view = controller(); flow = find(view, node => node.type === "Flow");
  await flow.props.onSubmit();
  assert.equal(calls.filter(call => call.url.includes("/orders/checkout")).length, 3, "One explicit retry after a stale quote conflict");
  assert.equal(createdOrders, 2, "A rejected stale quote creates no order");
  pending.clearSucceededPendingPayment("user_fixture", 777, "SUCCEEDED");
  liveCart = { ...cart, items: [] };
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert(flow.props.disabled); assert.equal(flow.props.subtotal, 0);
  assert.equal(await flow.props.onContinue(), false, "An empty cart cannot advance checkout");
  h.reset(); liveCart = cart;
  for (let i = 0; i < 6; i++) { view = controller(); await h.effects(); }
  view = controller(); flow = find(view, node => node.type === "Flow");
  loseCheckoutResponse = true;
  await flow.props.onSubmit();
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.checkoutUnknown, true);
  const lostPayload = calls.filter(call => call.url.includes("/orders/checkout")).at(-1).body;
  const quotesBeforeRecovery = calls.filter(call => call.url.endsWith("/seller-group-quotes")).length;
  const ordersBeforeRecovery = createdOrders;
  liveCart = { ...cart, items: [] }; view = controller(); flow = find(view, node => node.type === "Flow");
  await flow.props.onSubmit();
  assert.deepEqual(calls.filter(call => call.url.includes("/orders/checkout")).at(-1).body, lostPayload);
  assert.equal(createdOrders, ordersBeforeRecovery, "Lost response recovery replays the same signed attempt without a duplicate order");
  assert.equal(calls.filter(call => call.url.endsWith("/seller-group-quotes")).length, quotesBeforeRecovery);
  // A slow bank Init keeps the current checkout and its synchronous lock.
  h.reset(); liveCart = cart; holdQuote = false; holdPayment = true;
  paymentUrl = "https://pay.tbank-online.com/test";
  for (let i = 0; i < 6; i++) { view = controller(); await h.effects(); }
  view = controller(); flow = find(view, node => node.type === "Flow");
  const beforeSubmit = createdOrders;
  const openingBank = flow.props.onSubmit();
  await new Promise(resolve => setImmediate(resolve));
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert(flow.props.submitting);
  assert.equal(flow.props.pendingPayment, undefined, "Bank Init must not render a payment-resume screen");
  await flow.props.onSubmit();
  assert.equal(createdOrders, beforeSubmit + 1);
  resolvePayment(); await openingBank;
  assert.equal(window.location.href, paymentUrl);
  assert.equal(submissionLocks.at(-1), true, "Keep the button locked until bank navigation finishes");
  holdPayment = false;
  // Browser Back/refresh uses the server-bound purchase, not a storage hint.
  h.reset(); liveCart = { ...cart, checkoutOrderId: 777 };
  for (let i = 0; i < 8; i++) { view = controller(); await h.effects(); }
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.committedOrderId, 777);
  assert.equal(flow.props.subtotal, 2000); assert.equal(flow.props.deliveryPrice, 450);
  assert.equal(flow.props.deliveryCalculated, true);
  const checkoutCount = calls.filter(call => call.url.includes("/orders/checkout")).length;
  await flow.props.onSubmit();
  assert.equal(calls.filter(call => call.url.includes("/orders/checkout")).length, checkoutCount, "Returning from bank must only resume the same payment");
  // A real bank return remounts the page and releases its navigation lock.
  h.reset();
  for (let i = 0; i < 8; i++) { view = controller(); await h.effects(); }
  currentProfile = { ...defaultProfile, firstName: "Новый", phone: "+79990000005" };
  view = controller(); await h.effects();
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.recipient, "Тест Покупатель", "A created order retains its original recipient");
  liveCart = { ...cart, items: cart.items.map(item => ({ ...item, quantity: 1 })) };
  for (let i = 0; i < 5; i++) { view = controller(); await h.effects(); }
  view = controller(); flow = find(view, node => node.type === "Flow");
  assert.equal(flow.props.committedOrderId, null);
  assert.equal(flow.props.recipient, "Новый Покупатель", "A new purchase after a committed order reads the current profile again");
  assert.equal(flow.props.phone, "+79990000005");
  currentProfile = defaultProfile; liveCart = { ...cart, checkoutOrderId: 777 };
  h.reset(); resumedPaymentStatus = "SUCCEEDED";
  for (let i = 0; i < 8; i++) { view = controller(); await h.effects(); }
  assert.equal(orderNavigation.at(-1), "/account?tab=orders&orderId=777");
  resumedPaymentStatus = "PENDING";
  // Reopening /cart with a saved payment must leave its new contents editable.
  const cartHooks = hooks(), listeners = new Map(), navigation = [];
  const cartRouter = { push: url => navigation.push(url), replace: url => navigation.push(url) };
  window.addEventListener = (event, fn) => listeners.set(event, fn);
  window.removeEventListener = event => listeners.delete(event);
  let cartForPage = cart, mutations = 0, cartSearch = "", cartPaymentStatus = "PENDING", quantityFailure = null;
  let pageLoader = async () => cartForPage;
  const sessionState = { isAuthenticated: true, loading: false, error: null, revision: 0, reload: async () => ({ id: 1 }) };
  const cartApi = load("app/cart/lib/cartApi.ts", {
    "../../lib/api": {}, "./quantityLimits": load("app/cart/lib/quantityLimits.ts", {}),
  });
  pending.savePendingPaymentOrderId(cart.cartId, 888);
  const cartModule = load("app/cart/page.tsx", {
    react: { ...cartHooks.react, Suspense: "Suspense" }, "react/jsx-runtime": jsx,
    "next/link": { default: "Link" }, "next/navigation": { useRouter: () => cartRouter, useSearchParams: () => new URLSearchParams(cartSearch) },
    "../lib/api": { API_URL: "http://fixture", apiFetch: async () => Response.json({ status: cartPaymentStatus }) },
    "../lib/apiErrors": load("app/lib/apiErrors.ts", {}),
    "../lib/client-session": { getClientSessionRevision: () => sessionState.revision },
    "../checkout/lib/pendingPayment": pending,
    "@/app/components/ui/toast": { toast: { success() {} } }, "../lib/cartAuthority": { loadResolvedCart: () => pageLoader() },
    "../lib/cartEvents": { emitCartChanged() {} }, "../lib/authEvents": { AUTH_EVENT: "auth" },
    "../lib/useCurrentUser": { useCurrentUser: () => sessionState },
    "../checkout/CheckoutPageClient": { CheckoutPageClient: "Checkout" },
    "../components/Auth/AuthForm": { AuthForm: "Auth" },
    "./lib/quantityLimits": load("app/cart/lib/quantityLimits.ts", {}), "./lib/cartApi": { ...cartApi,
      updateQuantity: async (_id, variantId, quantity) => { if (quantityFailure) throw quantityFailure; mutations++; cartForPage = { ...cartForPage,
        items: cartForPage.items.map(item => item.variantId === variantId ? { ...item, quantity } : item) }; return cartForPage.items; },
      removeItem: async () => { mutations++; cartForPage = { ...cartForPage, items: [] }; return []; } },
    "./components/CartItemRow": { CartItemRow: "Row" }, "./components/CartSummary": { CartSummary: "Summary" },
    "./components/EmptyCart": { EmptyCart: "Empty" }, "../components/ui/CommerceSkeleton": { CartContentSkeleton: "Skeleton" },
    "../components/ui/ConfirmActionButton": { ConfirmActionButton: "Confirm" }, "../components/ui/Button": { Button: "Button" },
    "../components/ui/RequestError": { RequestError: "RequestError" },
    "./Cart.module.css": { default: {} },
  });
  function renderCart() { const wrapper = cartModule.default().props.children; return cartHooks.render(() => wrapper.type(wrapper.props)); }
  let cartView;
  for (let i = 0; i < 5; i++) { cartView = renderCart(); await cartHooks.effects(); }
  cartView = renderCart();
  const paymentAction = find(cartView, node => node.props?.["data-checkout-trigger"] === true);
  assert.equal(paymentAction.props.disabled, false, "A saved payment must never disable its own entry point");
  assert.equal(paymentAction.props.children, "Перейти к оформлению");
  paymentAction.props.onClick(); assert.equal(navigation.at(-1), "/cart?checkout=1");
  const row = find(cartView, node => node.type === "Row");
  assert(!row.props.locked); assert.equal(row.props.pending, false);
  assert.equal(find(cartView, node => node.type === "UnpaidOrders"), null);
  await row.props.onChangeQty(10, 3);
  cartView = renderCart();
  assert.equal(find(cartView, node => node.type === "Row").props.item.quantity, 3);
  await find(cartView, node => node.type === "Row").props.onRemove(10);
  cartView = renderCart();
  assert.equal(mutations, 2); assert(find(cartView, node => node.type === "Empty"));
  assert.equal(find(cartView, node => node.type === "UnpaidOrders"), null, "Previous orders belong to the account, not an empty cart");
  cartSearch = "checkout=1";
  cartView = renderCart(); await cartHooks.effects();
  assert(find(cartView, node => node.type === "Empty"));
  assert.equal(find(cartView, node => node.type === "Checkout"), null, "An empty cart never renders checkout, even with checkout=1");
  assert.equal(navigation.at(-1), "/cart");
  cartForPage = cart;
  listeners.get("focus")();
  for (let i = 0; i < 4; i++) { cartView = renderCart(); await cartHooks.effects(); }
  cartView = renderCart();
  find(cartView, node => node.type === "Checkout").props.onSubmitBusyChange(true);
  cartForPage = { ...cart, items: [] };
  listeners.get("focus")();
  cartView = renderCart(); await cartHooks.effects();
  assert(find(cartView, node => node.type === "Row"), "Focus during bank Init must not tear down the final checkout step");
  listeners.get("pageshow")({ persisted: true });
  for (let i = 0; i < 4; i++) { cartView = renderCart(); await cartHooks.effects(); }
  cartView = renderCart();
  assert(find(cartView, node => node.type === "Empty"), "Browser Back from bank must refresh the actual empty cart instead of preserving a busy form");
  cartPaymentStatus = "SUCCEEDED";
  pending.saveBankReturnOrder(cart.cartId, 777);
  listeners.get("focus")();
  for (let i = 0; i < 4; i++) { cartView = renderCart(); await cartHooks.effects(); }
  assert.equal(navigation.at(-1), "/account?tab=orders&orderId=777", "Confirmed bank return goes to the paid order even if cart cleanup already completed");
  assert.equal(pending.loadBankReturnOrder(cart.cartId), null);
  assert.equal(pending.loadPendingPaymentOrderId(cart.cartId), 888, "Editing the new cart does not cancel or replace the old order");
  // Errors describe a failed attempt; a fresh confirmed cart must not retain them.
  cartHooks.reset(); cartSearch = "";
  cartForPage = { ...cart, items: [{ ...cart.items[0], quantity: 3 }, { ...cart.items[0], variantId: 11, quantity: 2 }] };
  for (let i = 0; i < 4; i++) { cartView = renderCart(); await cartHooks.effects(); }
  quantityFailure = new cartApi.CartActionError(cartApi.PRODUCT_QUANTITY_LIMIT_MESSAGE);
  await find(cartView, node => node.type === "Row").props.onChangeQty(10, 4);
  cartView = renderCart();
  assert.equal(find(cartView, node => node.type === "Row" && node.props.item.variantId === 10).props.error, cartApi.PRODUCT_QUANTITY_LIMIT_MESSAGE);
  quantityFailure = null;
  await find(cartView, node => node.type === "Row").props.onChangeQty(11, 1);
  cartView = renderCart();
  assert(!find(cartView, node => node.type === "Row" && node.props.item.variantId === 10).props.error,
    "Reducing another size of the same product clears the obsolete limit error");
  quantityFailure = new cartApi.CartActionError("Доступно только 1 шт", 1);
  await find(cartView, node => node.type === "Row").props.onChangeQty(10, 4);
  cartView = renderCart();
  assert.equal(find(cartView, node => node.type === "Row").props.maxQuantity, 1);
  // The server now confirms newer stock, but still reports an over-limit cart.
  cartForPage = { ...cartForPage, items: cartForPage.items.map(item => ({ ...item, quantity: 3, availableQuantity: 5 })) };
  listeners.get("focus")();
  for (let i = 0; i < 4; i++) { cartView = renderCart(); await cartHooks.effects(); }
  assert(!find(cartView, node => node.type === "Row").props.error, "A successful reload clears old attempt errors and stock overrides");
  assert.equal(find(cartView, node => node.type === "Row").props.maxQuantity, 2);
  assert(find(cartView, node => node.props?.role === "alert" && node.props.children === cartApi.PRODUCT_QUANTITY_LIMIT_MESSAGE),
    "A real current limit violation stays visible until the contents are fixed");
  assert.equal(find(cartView, node => node.props?.["data-checkout-trigger"] === true).props.disabled, true);
  quantityFailure = null;
  await find(cartView, node => node.type === "Row").props.onChangeQty(10, 2);
  cartView = renderCart();
  assert.equal(find(cartView, node => node.props?.role === "alert" && node.props.children === cartApi.PRODUCT_QUANTITY_LIMIT_MESSAGE), null);
  assert.equal(find(cartView, node => node.props?.["data-checkout-trigger"] === true).props.disabled, false);
  cartHooks.reset(); cartSearch = "";
  pageLoader = async () => { throw new Error("private transport failure"); };
  for (let i = 0; i < 4; i++) { cartView = renderCart(); await cartHooks.effects(); }
  const requestError = find(renderCart(), node => node.type === "RequestError");
  assert(requestError); assert.equal(find(renderCart(), node => node.type === "Empty"), null);
  let finishReload;
  pageLoader = () => new Promise(resolve => { finishReload = resolve; });
  requestError.props.onRetry(); cartView = renderCart(); await cartHooks.effects();
  cartView = renderCart();
  assert.equal(find(cartView, node => node.type === "RequestError").props.loading, true);
  assert.equal(find(cartView, node => node.type === "Skeleton"), null, "Retry keeps the error and spinner instead of replacing them with a skeleton");
  finishReload(cartForPage); await new Promise(setImmediate);
  assert.equal(find(renderCart(), node => node.type === "RequestError"), null);
  pageLoader = async () => { throw new Error("private refresh failure"); };
  listeners.get("focus")();
  for (let i = 0; i < 4; i++) { cartView = renderCart(); await cartHooks.effects(); }
  cartView = renderCart();
  assert(find(cartView, node => node.type === "Row"), "A failed background refresh preserves the displayed cart");
  assert.equal(find(cartView, node => node.type === "RequestError").props.variant, "inline");
  assert.equal(find(cartView, node => node.type === "Row").props.pending, true);
  const beforeBlockedMutation = mutations;
  await find(cartView, node => node.type === "Row").props.onChangeQty(10, 1);
  assert.equal(mutations, beforeBlockedMutation, "Unconfirmed data cannot be changed or checked out");
  assert.equal(find(cartView, node => node.props?.["data-checkout-trigger"] === true).props.disabled, true);
  pageLoader = async () => cartForPage;
  find(cartView, node => node.type === "RequestError").props.onRetry();
  for (let i = 0; i < 4; i++) { cartView = renderCart(); await cartHooks.effects(); }
  assert.equal(find(renderCart(), node => node.type === "RequestError"), null);
  assert.equal(find(renderCart(), node => node.type === "Row").props.pending, false);
  console.log("Cart checkout: retained purchase on Back/refresh, same payment retry, confirmed return, empty cart, slow Init, lost-response idempotency and edits passed");
  console.log("Cart alerts: corrected sibling variant, refreshed stock and actual limit violation lifecycle passed");
  console.log("Cart error: failure differs from empty, retry keeps its error block and confirmed data replaces it");
  console.log("Checkout recipient: current profile, manual override, changed/cleared profile and committed order isolation passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
