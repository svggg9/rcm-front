/* eslint-disable @typescript-eslint/no-require-imports -- Local disposable API fixture; no working database or SMTP. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const origin = "http://127.0.0.1:13045";
const api = "http://127.0.0.1:19645";
// Optional delay makes loading states reviewable without a real delivery service.
const deliveryDelay = Math.min(30000, Math.max(0, Number(process.env.RCM_FIXTURE_DELIVERY_DELAY_MS) || 0));
const checkoutScenario = process.env.RCM_FIXTURE_CHECKOUT === "1";
const paymentDelay = Math.min(30000, Math.max(0, Number(process.env.RCM_FIXTURE_PAYMENT_DELAY_MS) || 0));
let failFixturePayment = process.env.RCM_FIXTURE_PAYMENT_FAIL === "1";
let fixtureCartRevision = 0, purchaseRevision = null, fixturePaid = false;
const dir = path.resolve("build/email-auth");
fs.mkdirSync(dir, { recursive: true });
const calls = [];
const deadlines = new Map();
const challenges = new Map();
const guest = "guest_550e8400-e29b-41d4-a716-446655440000";
const userCartId = "user_fixture@example.test";
const item = { productId: 407, variantId: 901, sellerId: 1, title: "MoonSwatch Mission to Saturn, 42 мм",
  brand: "Swatch × Omega", color: "Бежевый / коричневый", article: "100220", publicId: "dm0905",
  size: null, price: 15900, availableQuantity: 5, quantity: 2,
  imageUrl: "https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-watch-saturn/1-1-98a277ac110647e9.webp" };
const extraItems = process.env.RCM_FIXTURE_TWO_ITEMS === "1" ? [{ ...item, productId: 408, variantId: 902,
  title: "Термокружка Quencher ProTour", brand: "Stanley", color: "Бежевый", article: "100221", price: 2000, quantity: 1 }] : [];
let userItems = [{ ...item }, ...extraItems];
let guestItems = [{ ...item }, ...extraItems];
const favoritesScenario = process.env.RCM_FIXTURE_FAVORITES === "1";
const fixtureProfile = { id: 1, email: "fixture@example.test", emailVerified: true, firstName: "Тест",
  lastName: "Покупатель", phone: "+79990000000", role: "USER" };
const favoriteProducts = favoritesScenario ? [
  { id: 407, publicId: "dm0905", title: item.title, brand: item.brand, images: [item.imageUrl], minPrice: 15900 },
  { id: 408, publicId: "demo408", title: "Термокружка Quencher ProTour", brand: "Stanley", images: ["/placeholder.png"], minPrice: 2000 },
  { id: 409, publicId: "demo409", title: "Кардиган из шерсти с лацканами", brand: "Тест", images: ["/placeholder.png"], minPrice: 17999 },
] : [];
let favoriteIds = favoriteProducts.map(product => product.id);
let quoteNumber = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  let raw = ""; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  calls.push({ method: req.method, path: url.pathname, body });
  fs.writeFileSync(path.join(dir, "calls.json"), JSON.stringify(calls, null, 2));
  const auth = checkoutScenario || (req.headers.cookie || "").includes("email-auth-fixture=1");
  function reply(data, status = 200) { res.statusCode = status; res.end(JSON.stringify(data)); }
  if (checkoutScenario && url.pathname === "/__fixture/reset" && req.method === "POST") {
    userItems = [{ ...item }, ...extraItems];
    fixtureCartRevision++; purchaseRevision = null; fixturePaid = false;
    failFixturePayment = body.paymentFails === true;
    return reply({ reset: true });
  }
  if (checkoutScenario && (url.pathname === "/api/orders/777" || url.pathname === "/api/orders/777/group" || url.pathname === "/api/orders/my/list")) {
    const order = { id: 777, orderGroupId: "fixture-only", status: fixturePaid ? "CONFIRMED" : "NEW", paymentStatus: fixturePaid ? "PAID" : "PENDING",
      deliveryStatus: "PENDING", subtotalAmount: 31800, deliveryAmount: 450, discountAmount: 0,
      totalAmount: 32250, currency: "RUB", recipientName: "Тест Покупатель", recipientPhone: "+79990000000",
      deliveryAddress: "ул. Тверская, 12", pickupPointId: "44-1", deliveryMethod: "PICKUP_POINT", fittingMode: "WITHOUT_FITTING",
      createdAt: new Date().toISOString(), cancellationAllowed: false, paymentAllowed: true,
      items: [{ ...item, productTitle: item.title, variantId: 901, lineTotal: 31800 }] };
    return reply(url.pathname.endsWith("/list") ? { content: [order], totalElements: 1, totalPages: 1, number: 0, size: 20 } : url.pathname.endsWith("/group") ? [order] : order);
  }
  if (checkoutScenario && (url.pathname === "/api/payments/order/777/group-last" || url.pathname === "/api/payments/fixture-pay/sync")) return reply({ status: fixturePaid ? "SUCCEEDED" : "PENDING", externalId: "fixture-pay" });
  if (favoritesScenario) {
    if (url.pathname === "/api/products/407/page") return reply({ product: {
      ...favoriteProducts[0], sellerId: 1, status: "ACTIVE", article: "100220", description: "Тестовый товар", category: "Одежда",
      variants: [40, 41, 42, 43, 44, 45].map((size, index) => ({ id: 901 + index, size: String(size), color: "Серый", price: 15900, availableQuantity: index === 1 ? 0 : 5 })),
    }, related: [] });
    if (url.pathname === "/api/storefront/home") return reply({ collections: [{ id: 1, title: "Подборка магазина", products: favoriteProducts.map(product => ({ ...product, coverImage: product.images[0] || null })) }] });
    if (url.pathname === "/api/favorites/ids") return reply(favoriteIds);
    if (url.pathname === "/api/favorites") return reply(favoriteProducts.filter(product => favoriteIds.includes(product.id)));
    if (/^\/api\/favorites\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.split("/").pop());
      favoriteIds = req.method === "DELETE" ? favoriteIds.filter(value => value !== id) : [...new Set([...favoriteIds, id])];
      return reply(null, 204);
    }
    if (/^\/api\/products\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.split("/").pop());
      return reply({ ...favoriteProducts.find(product => product.id === id), variants: id === 408
        ? [{ id: 901, size: "", color: "Бежевый", price: 2000, availableQuantity: 5 }]
        : [40, 41, 42, 43, 44, 45].map((size, index) => ({ id: 901 + index, size: String(size), color: "Серый", price: 15900, availableQuantity: index === 1 ? 0 : 5 })) });
    }
    if (url.pathname === "/api/cart/add") {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (userItems.reduce((sum, line) => sum + line.quantity, 0) >= 5) return reply({ message: "PRODUCT_QUANTITY_LIMIT" }, 400);
      userItems = userItems.map(line => ({ ...line, quantity: line.quantity + 1 }));
      return reply(userItems);
    }
  }
  function login() {
    userItems = [{ ...item, quantity: 3 }, ...extraItems]; // Fixture merge: two guest units + one existing unit.
    res.setHeader("Set-Cookie", "email-auth-fixture=1; Path=/; HttpOnly; SameSite=Lax");
    reply({ cartId: userCartId });
  }
  if (url.pathname === "/api/auth/email/login/start") {
    if (body.email === "server-error@example.test") return reply({ message: "private SQL /api/stack details" }, 500);
    if (body.email === "rate-limit@example.test") return reply({ message: "email_login_rate_limited" }, 429);
    if ((deadlines.get(body.email) || 0) > Date.now()) return reply({ message: "email_login_rate_limited" }, 429);
    deadlines.set(body.email, Date.now() + 60_000); challenges.set(body.email, true);
    await new Promise(resolve => setTimeout(resolve, 250));
    return reply({ ttlSeconds: 600, resendAfterSeconds: 60 }, 202);
  }
  if (url.pathname === "/api/auth/email/login/complete") {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (body.code !== "123456" || !challenges.get(body.email)) return reply({ message: "invalid_or_expired_login_code" }, 400);
    challenges.delete(body.email); return login();
  }
  if (url.pathname === "/api/auth/login") {
    if (body.password !== "fixture-password") return reply({}, 401);
    return login();
  }
  if (url.pathname === "/api/auth/logout") {
    res.setHeader("Set-Cookie", "email-auth-fixture=; Path=/; Max-Age=0"); return reply({}, 204);
  }
  if (url.pathname === "/api/auth/session") return auth
    ? reply({ id: 1, username: "fixture@example.test", role: "USER" }) : reply(null, 204);
  if (url.pathname === "/api/profile") {
    if (req.method === "PUT") {
      for (const field of ["firstName", "lastName", "phone"]) if (Object.hasOwn(body, field)) fixtureProfile[field] = body[field];
    }
    return reply(fixtureProfile);
  }
  if (url.pathname === "/api/cart/new-id") return reply({ cartId: guest });
  if (url.pathname === "/api/cart/me") return reply({ cartId: userCartId, items: userItems,
    checkoutOrderId: checkoutScenario && purchaseRevision === fixtureCartRevision && !fixturePaid ? 777 : null });
  if (url.pathname === "/api/cart/quantity" || url.pathname === "/api/cart/remove") {
    await new Promise(resolve => setTimeout(resolve, 300));
    const isUserCart = url.searchParams.get("cartId") === userCartId;
    let contents = isUserCart ? userItems : guestItems;
    const variantId = Number(url.searchParams.get("variantId"));
    if (url.pathname.endsWith("/quantity")) {
      const quantity = Number(url.searchParams.get("qty"));
      if (quantity < 1 || quantity > 5) return reply({ message: "Requested qty " + quantity + " exceeds available stock 5" }, 400);
      contents = contents.map(line => line.variantId === variantId ? { ...line, quantity } : line);
    } else contents = contents.filter(line => line.variantId !== variantId);
    if (isUserCart) userItems = contents; else guestItems = contents;
    if (isUserCart) fixtureCartRevision++;
    return reply(contents);
  }
  if (url.pathname === "/api/cart") return reply(url.searchParams.get("cartId") === userCartId ? userItems : guestItems);
  if (url.pathname.endsWith("/count")) return reply({ count: (auth ? userItems : guestItems).reduce((sum, line) => sum + line.quantity, 0) });
  if (url.pathname === "/api/favorites") return reply([]);
  if (url.pathname === "/api/delivery/cities/search") {
    if (deliveryDelay) await new Promise(resolve => setTimeout(resolve, deliveryDelay));
    const q = (url.searchParams.get("query") || "").toLowerCase();
    return reply([{ code: 44, cityUuid: "44", fullName: "Москва", countryCode: "RU" },
      { code: 137, cityUuid: "137", fullName: "Санкт-Петербург", countryCode: "RU" }].filter(city => city.fullName.toLowerCase().includes(q)));
  }
  if (url.pathname === "/api/delivery/pickup-points/search") {
    await new Promise(resolve => setTimeout(resolve, deliveryDelay || 150));
    const code = body.cityCode; const spb = code === 137;
    return reply({ detectedAddress: null, points: [1, 2].map(n => ({ id: String(code) + "-" + n, name: "СДЭК", type: "PVZ",
      fullAddress: spb ? n === 1 ? "ул. Нахимова, 14/41" : "Малый проспект, 64" : n === 1 ? "ул. Тверская, 12" : "ул. Петровка, 20",
      instruction: "Вход со стороны улицы", cityCode: code, latitude: spb ? 59.94 + n * .01 : 55.75 + n * .01,
      longitude: spb ? 30.24 + n * .01 : 37.61 + n * .01 })) });
  }
  if (url.pathname === "/api/delivery/seller-group-quotes") {
    await new Promise(resolve => setTimeout(resolve, deliveryDelay || 250)); quoteNumber++;
    return reply({ quoteToken: "quote-" + quoteNumber, checkoutToken: "checkout-" + quoteNumber, provider: "CDEK", method: "PICKUP_POINT",
      priceAmount: 450, currency: "RUB", externalOfferId: "offer-" + quoteNumber,
      expiresAt: new Date(Date.now() + 900000).toISOString(), periodMinDays: 2, periodMaxDays: 4,
      sellerDeliveryCosts: [{ sellerId: 1, deliveryCostAmount: 450, currency: "RUB" }] });
  }
  if (url.pathname === "/api/orders/checkout") {
    if (checkoutScenario) purchaseRevision = fixtureCartRevision;
    return reply([{ id: 777, orderGroupId: "fixture-only" }]);
  }
  if (url.pathname === "/api/payments/order/777/group" || (checkoutScenario && url.pathname === "/api/payments/group/fixture-only")) {
    if (paymentDelay) await new Promise(resolve => setTimeout(resolve, paymentDelay));
    return checkoutScenario && !failFixturePayment
      ? reply({ confirmationUrl: api + "/__fixture/bank" })
      : reply({ message: "private payment provider stack" }, 503);
  }
  if (checkoutScenario && url.pathname === "/__fixture/bank") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end('<h1>Тестовая страница банка</h1><p>Реального платежа нет</p><a href="/__fixture/paid">Подтвердить тестовую оплату</a>');
  }
  if (checkoutScenario && url.pathname === "/__fixture/paid") {
    fixturePaid = true;
    if (purchaseRevision === fixtureCartRevision) userItems = [];
    res.writeHead(302, { Location: origin + "/account?tab=orders&orderId=777" }); return res.end();
  }
  if (url.pathname.includes("storefront/home")) return reply({ sections: [] });
  if (url.pathname === "/__fixture/calls") return reply(calls);
  return reply([]);
});
server.listen(19645, "127.0.0.1", () => {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "13045"], {
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/email-auth-dev", NEXT_PUBLIC_API_URL: api,
      SERVER_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: "inherit",
  });
  child.on("exit", code => { server.close(); process.exitCode = code || 0; });
  function close() { child.kill(); server.close(); }
  process.on("SIGINT", close); process.on("SIGTERM", close);
  console.log("Isolated email auth fixture: " + origin + " (mock API, no SMTP or working database)");
});
