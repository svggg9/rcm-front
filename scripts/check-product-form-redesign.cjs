/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

// Separate frontend/API ports and dist directory leave the developer's servers alone.
const origin = "http://localhost:13057";
const api = "http://localhost:19657";
const output = path.resolve(__dirname, "../build/product-form-screenshots");
let role = "SELLER";
let failUploadOnce = false;
let photoSequence = 1000;
const calls = [];
const brand = { id: 1, name: "Тестовый магазин", slug: "fixture-store", description: "Описание магазина", wordmarkUrl: "/icons/like.svg" };
const onboarding = { applicationCompleted: true, brandCompleted: true, legalCompleted: true, agreementAccepted: true, progress: 100, completedSteps: 4, totalSteps: 4 };
const summary = { activeProducts: 0, attentionProducts: 0, totalProducts: 1, readyOrders: 0, activeOrders: 0, totalOrders: 0, estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, availablePayout: 0, processingPayout: 0, inPayoutAmount: 0, failedPayouts: 0, telegramLinked: false, supportTelegramUrl: null, recentEvents: [] };
function draft(id, title = "Новый товар") {
  return { id, version: 1, publicId: String(id), title, description: "", composition: null, article: String(100000 + id), brandId: 1, brand: brand.name, categoryId: null, category: null, suggestedCategoryName: null, audience: "UNISEX", status: "DRAFT", moderationComment: null, packageWidthCm: null, packageHeightCm: null, packageLengthCm: null, packageWeightKg: null, variants: [], images: [], imageItems: [], colorways: [] };
}
const products = new Map([[400, draft(400, "Существующий товар")], [501, draft(501)]]);
products.set(402, { ...draft(402, "Товар с разными ценами"),
  variants: [
    { id: 4020, colorwayId: 40200, color: 'Белый', size: 'S', price: 100, sku: 'legacy-white-s' },
    { id: 4021, colorwayId: 40200, color: 'Белый', size: 'M', price: 100, sku: 'legacy-white-m' },
    { id: 4022, colorwayId: 40201, color: 'Чёрный', size: 'S', price: 200, sku: 'legacy-black-s' },
  ].map(variant => ({ ...variant, stockTrackingEnabled: true, stockQuantity: 5, availableQuantity: 5 })),
  colorways: [{ id: 40200, color: 'Белый', images: [] }, { id: 40201, color: 'Чёрный', images: [] }] });
let nextId = 500;
const paged = (content = []) => ({ content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0 });
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  const call = { method: req.method, path: url.pathname };
  calls.push(call);
  let data = [];
  if (url.pathname === "/api/auth/session") data = { id: 70, username: "seller", role };
  else if (url.pathname === "/api/profile") data = { displayName: "Тестовый продавец", email: "seller@example.test" };
  else if (url.pathname === "/api/seller/legal-info") { res.statusCode = 204; return res.end(); }
  else if (url.pathname === "/api/seller/brands") data = [brand];
  else if (url.pathname === "/api/seller/onboarding-status") data = onboarding;
  else if (url.pathname === "/api/seller/dashboard-summary") data = summary;
  else if (url.pathname === "/api/seller/dashboard/tasks") data = { content: [], hasNext: false, number: 0 };
  else if (url.pathname === "/api/seller/finance/summary") data = { availableAmount: 0, processingAmount: 0, inPayoutAmount: 0, failedPayoutAmount: 0, nextPayoutAmount: 0, reconciliationDifference: 0, operations: [], nextPayout: null, nextPayoutDate: null, bankDetailsReady: true, paidThisMonthAmount: 0, estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, adjustmentsAmount: 0, paidOutAmount: 0 };
  else if (url.pathname === "/api/catalog/categories") data = [{ id: 1, name: "Одежда", label: "Одежда", slug: "clothing", parentId: null, isActive: true, effectiveActive: true }];
  else if (url.pathname === "/api/seller/products/draft" && req.method === "POST") {
    data = ++nextId;
    products.set(data, draft(data));
  } else if (/^\/api\/seller\/products\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/").pop());
    if (!products.has(id)) { res.statusCode = 404; return res.end(JSON.stringify({ message: "Товар не найден" })); }
    if (req.method === "PUT") {
      let body = ""; for await (const chunk of req) body += chunk;
      const values = JSON.parse(body);
      call.values = values;
      const product = products.get(id);
      if (values.expectedVersion !== product.version) { res.statusCode = 409; return res.end(JSON.stringify({ message: "Товар изменился" })); }
      const colorways = [...product.colorways];
      const rows = values.variants.map((variant, index) => {
        const color = variant.suggestedColorName ?? "";
        let group = colorways.find(group => group.id === variant.colorwayId) ?? colorways.find(group => (group.color ?? "") === color);
        if (group) { group.color = color; group.colorId = variant.colorId; }
        if (!group) { group = { id: id * 100 + colorways.length, color, colorId: variant.colorId, images: [] }; colorways.push(group); }
        const old = product.variants.find(row => row.id === variant.id);
        const stock = variant.stockTrackingEnabled ? variant.stockQuantity ?? old?.stockQuantity ?? 0 : null;
        return { ...variant, id: variant.id ?? id * 10 + index, colorwayId: group.id, size: variant.suggestedSizeName ?? "", color,
          availableQuantity: stock, stockQuantity: stock, reservedQuantity: 0, sku: variant.sku ?? `fixture-${id}-${index}` };
      });
      products.set(id, { ...product, ...values, version: product.version + 1, colorways, variants: rows });
    }
    data = products.get(id);
  } else if (/^\/api\/seller\/products\/\d+\/images/.test(url.pathname)) {
    const id = Number(url.pathname.split("/")[4]);
    const product = products.get(id);
    let chunks = []; for await (const chunk of req) chunks.push(chunk);
    if (req.method === "POST" && url.pathname.endsWith("/images")) {
      const multipart = await new Request(api + url.pathname, { method: "POST", headers: { "content-type": req.headers["content-type"] }, body: Buffer.concat(chunks) }).formData();
      const token = multipart.get("clientUploadId");
      let image = product.imageItems.find(image => image.clientUploadId === token);
      if (!image) {
        const file = multipart.get("file");
        image = { id: ++photoSequence, clientUploadId: token, colorwayId: Number(multipart.get("colorwayId")), url: "data:image/png;base64," + Buffer.from(await file.arrayBuffer()).toString("base64"), sortOrder: product.imageItems.length, width: 1200, height: 1600 };
        product.imageItems.push(image); product.images.push(image.url); product.version++;
      }
      call.token = token;
      data = image.url;
      if (failUploadOnce) { failUploadOnce = false; res.statusCode = 502; return res.end(JSON.stringify({ message: "Соединение прервано" })); }
    } else if (req.method === "POST" && url.pathname.endsWith("/reorder")) {
      const values = JSON.parse(Buffer.concat(chunks));
      product.imageItems = values.imageIds.map((id, index) => ({ ...product.imageItems.find(image => image.id === id), sortOrder: index }));
      product.images = product.imageItems.map(image => image.url); product.version++;
    } else if (req.method === "DELETE") {
      const photoId = Number(url.pathname.split("/").pop());
      product.imageItems = product.imageItems.filter(image => image.id !== photoId);
      product.images = product.imageItems.map(image => image.url); product.version++;
    }
  } else if (url.pathname.endsWith("/publish")) {
    const product = products.get(Number(url.pathname.split("/")[4])); product.status = "MODERATION"; data = product;
  } else if (url.pathname === "/api/admin/products/colors") data = [{ id: 1, name: "Белый", hex: "#ffffff" }, { id: 2, name: "Чёрный", hex: "#000000" }];
  else if (/^\/api\/admin\/products\/\d+\/colorways\/\d+\/color$/.test(url.pathname)) {
    let body = ""; for await (const chunk of req) body += chunk;
    const values = JSON.parse(body); call.values = values;
    const product = products.get(Number(url.pathname.split("/")[4]));
    product.colorways.find(group => group.id === Number(url.pathname.split("/")[6])).colorId = values.colorId;
    data = product;
  } else if (/^\/api\/admin\/products\/\d+$/.test(url.pathname)) data = products.get(Number(url.pathname.split("/").pop()));
  else if (url.pathname === "/api/admin/products/list") data = paged([...products.values()]);
  else if (url.pathname.endsWith("/status-counts")) data = { ALL: 2, DRAFT: 2, MODERATION: 0 };
  else if (url.pathname === "/api/admin/dictionaries/categories") data = [{ id: 1, name: "Одежда", label: "Одежда", parentId: null, isActive: true, effectiveActive: true }];
  else if (url.pathname === "/api/seller/products/list") data = paged([...products.values()].map(product => ({ id: product.id, title: product.title, status: product.status, article: product.article, brandName: brand.name, categoryName: null, coverImage: null, minPrice: 0, totalStock: 0, variantsCount: product.variants.length })));
  else if (/\/available-products$/.test(url.pathname)) data = paged();
  else if (url.pathname === "/api/seller/orders/list" || url.pathname === "/api/seller/returns/list" || url.pathname === "/api/seller/finance/payouts" || url.pathname === "/api/seller/finance/operations") data = paged();
  else if (url.pathname === "/api/cart") data = { items: [] };
  res.end(JSON.stringify(data));
});

const outputFile = name => path.join(output, name);
const form = page => page.locator('section[data-editor-page]');
async function ready(page) { await form(page).waitFor(); await page.waitForLoadState('networkidle'); }
async function save(page) {
  await page.evaluate(() => document.activeElement?.blur());
  await form(page).locator('[data-state="saved"]').waitFor();
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(19657, '127.0.0.1', resolve));
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--webpack', '-p', '13057'], {
    cwd: path.resolve(__dirname, '..'), windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: 'build/product-form-check', SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = ''; child.stdout.on('data', data => { logs += data; }); child.stderr.on('data', data => { logs += data; });
  let browser;
  try {
    for (let i = 0; i < 90; i++) {
      if (child.exitCode !== null) throw new Error(logs.slice(-2000));
      try { await fetch(origin + '/seller/products', { signal: AbortSignal.timeout(3000) }); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(60000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => void dialog.dismiss());
    await page.goto(origin + '/seller/products/402/edit'); await page.locator('dialog[open]').first().waitFor();
    const legacyPrice = page.getByRole('textbox', { name: 'Цена товара', exact: true });
    assert.equal(await legacyPrice.inputValue(), '');
    assert.equal(await legacyPrice.getAttribute('aria-invalid'), 'true');
    assert.equal(calls.filter(call => call.path === '/api/seller/products/402' && call.method === 'PUT').length, 0, 'Opening legacy prices does not change them');
    await legacyPrice.fill('175,25'); await legacyPrice.press('Tab');
    await page.locator('dialog[open] [data-state="saved"]').waitFor();
    assert.ok(products.get(402).variants.every(variant => variant.price === 175.25));
    await page.reload(); await page.locator('dialog[open]').first().waitFor();
    assert.equal(await legacyPrice.inputValue(), '175,25');
    await page.getByRole('button', { name: 'Закрыть редактор', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/seller/products');
    console.log('PASS: legacy mixed colors/sizes require explicit common price and keep it after save/refresh');
    await page.goto(origin + '/seller/products/501/create'); await ready(page);
    assert.equal(await page.locator('dialog[open]').count(), 0);
    const titleButton = form(page).getByRole('button', { name: /^Изменить название товара:/ });
    await titleButton.click();
    await form(page).getByRole('textbox', { name: 'Название товара', exact: true }).fill('Футболка из хлопка');
    await page.keyboard.press('Enter');
    await page.getByRole('combobox', { name: /Категория/ }).click();
    await page.getByRole('option', { name: 'Одежда', exact: true }).click();
    await page.getByRole('radio', { name: 'Женское', exact: true }).click();
    const description = page.getByRole('textbox', { name: 'Описание товара', exact: true });
    await description.fill('Мягкий хлопок\nСвободная посадка');
    await description.evaluate(element => element.setSelectionRange(14, element.value.length));
    await page.getByRole('button', { name: 'Список: Описание товара', exact: true }).click();
    assert.match(await description.inputValue(), /▪ Свободная посадка/);
    await description.fill('Мягкий хлопок\n\n▪ Свободная посадка\n▪ Круглый вырез');
    await page.locator('#product-description details > summary').click();
    await page.getByRole('textbox', { name: 'Состав', exact: true }).fill('100% хлопок');
    const group = page.getByRole('region', { name: 'Вариант 1', exact: true });
    await group.getByRole('textbox', { name: /Название оттенка/ }).fill('Молочный');
    const price = page.getByRole('textbox', { name: 'Цена товара', exact: true });
    assert.equal(await price.count(), 1);
    await price.fill('1 290,50');
    await group.getByRole('textbox', { name: /На складе:/ }).fill('12');
    await group.getByRole('textbox', { name: /^Размер/ }).fill('S');
    await group.getByRole('button', { name: 'Добавить размер', exact: true }).click();
    await group.getByRole('textbox', { name: /^Размер/ }).nth(1).fill('M');
    await group.getByRole('textbox', { name: /На складе:/ }).nth(1).fill('7');
    await page.getByRole('button', { name: 'Добавить оттенок', exact: true }).click();
    const second = page.getByRole('region', { name: 'Вариант 2', exact: true });
    await second.getByRole('textbox', { name: /Название оттенка/ }).fill('Слоновая кость');
    assert.equal(await price.count(), 1, 'Adding a shade keeps one shared price field');
    await price.fill('1490,50');
    await second.getByRole('checkbox', { name: 'Учитывать остатки', exact: true }).uncheck();
    assert.equal(await second.getByText('Без учёта', { exact: true }).count(), 1);
    for (const [name,value] of [['Длина, см','30'],['Ширина, см','25'],['Высота, см','4'],['Вес, кг','0,3']]) await page.getByRole('textbox', { name, exact: true }).fill(value);
    await page.getByText('Расчётный вес СДЭК', { exact: true }).waitFor();
    assert.equal(await page.getByText('Заполните четыре поля, чтобы увидеть расчётный вес СДЭК').count(), 0);
    await save(page);
    assert.equal(products.get(501).variants.length, 3);
    assert.ok(products.get(501).variants.every(variant => variant.price === 1490.5), 'All colors and sizes save the common price');
    assert.equal(products.get(501).variants[2].stockTrackingEnabled, false);
    await page.reload(); await ready(page);
    assert.equal(await price.inputValue(), '1490,5');
    assert.equal(await description.inputValue(), 'Мягкий хлопок\n\n▪ Свободная посадка\n▪ Круглый вырез');
    assert.equal(await page.getByRole('radio', { name: 'Женское' }).getAttribute('aria-checked'), 'true');
    console.log('PASS: fields, paragraph/list serialization, optional composition, one product price across shades/sizes, explicit stock, packaging, save/refresh');

    const photoBuffer = Buffer.from(await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1600; const context = canvas.getContext('2d'); context.fillStyle = '#eee7db'; context.fillRect(0,0,1200,1600); context.fillStyle = '#444'; context.fillRect(300,300,600,900); return canvas.toDataURL('image/png').split(',')[1]; }), 'base64');
    const file = { name: 'shade.png', mimeType: 'image/png', buffer: photoBuffer };
    await group.getByRole('button', { name: 'Фото оттенка' }).click();
    const photos = page.locator('#product-photos');
    let before = calls.filter(call => /\/images/.test(call.path)).length;
    await photos.locator('input[type=file]').setInputFiles([file]);
    await photos.getByRole('button', { name: /Показать фото 1/ }).waitFor();
    assert.equal(calls.filter(call => /\/images/.test(call.path)).length, before, 'Picking a photo has no server mutation');
    await form(page).getByRole('button', { name: 'Предпросмотр' }).click();
    await page.getByRole('dialog', { name: 'Предпросмотр товара' }).waitFor();
    await page.getByRole('button', { name: 'Вернуться к редактированию', exact: true }).click();
    await save(page);
    assert.equal(products.get(501).imageItems.length, 1);
    assert.equal(products.get(501).imageItems[0].colorwayId, products.get(501).variants[0].colorwayId);
    await second.getByRole('button', { name: 'Фото оттенка' }).click();
    failUploadOnce = true;
    await photos.locator('input[type=file]').setInputFiles([file]);
    await photos.getByRole('button', { name: /Показать фото 2/ }).waitFor();
    await form(page).locator('[data-state=error]').waitFor();
    await page.getByRole('button', { name: 'Повторить сохранение', exact: true }).click();
    await save(page);
    assert.equal(products.get(501).imageItems.length, 2, 'Retry does not duplicate a confirmed upload');
    assert.equal(products.get(501).imageItems[1].colorwayId, products.get(501).variants[2].colorwayId);
    await photos.getByRole('button', { name: /Показать фото 2/ }).click();
    before = calls.filter(call => /\/images/.test(call.path)).length;
    await photos.getByRole('button', { name: 'Сделать главным' }).click();
    assert.equal(calls.filter(call => /\/images/.test(call.path)).length, before, 'Reorder is staged');
    await save(page);
    assert.equal(products.get(501).imageItems[0].colorwayId, products.get(501).variants[2].colorwayId);
    console.log('PASS: shade-linked photos, staging/autosave, nested preview, save/reorder, lost upload acknowledgement and retry without duplicates');

    for (const width of [1280,390,320]) {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
      await page.reload(); await ready(page);
      for (const id of ['product-general','product-description','product-step-variants','product-step-shipping','product-step-photos']) assert.equal(await page.locator('#'+id).isVisible(), true, 'Continuous section ' + id + ' at ' + width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No overflow at ' + width);
      await page.screenshot({ path: outputFile(`form-${width}.png`), fullPage: true });
      await page.locator('#editor-tab-variants').click();
      await page.waitForFunction(() => {
        const section = document.querySelector('#product-step-variants');
        return Math.abs(section.getBoundingClientRect().top - parseFloat(getComputedStyle(section).scrollMarginTop)) < 2;
      });
      const topbar = await page.locator('[data-editor-topbar]').evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return { top: bounds.top, expected: parseFloat(getComputedStyle(element).top), bottom: bounds.bottom,
          titleTop: element.querySelector('h1').getBoundingClientRect().top };
      });
      assert.ok(Math.abs(topbar.top - topbar.expected) <= 2, 'Whole editor header sticks at ' + width);
      assert.ok(topbar.titleTop >= topbar.top && topbar.titleTop < topbar.bottom, 'Product title stays visible at ' + width);
      const geometry = await page.evaluate(() => ({ nav: document.querySelector('[data-editor-navigation]').getBoundingClientRect().bottom, section: document.querySelector('#product-step-variants').getBoundingClientRect().top }));
      assert.ok(geometry.section >= geometry.nav - 2, 'Anchor is below sticky navigation at ' + width);
      await page.waitForFunction(() => document.querySelector('#editor-tab-variants')?.getAttribute('aria-current') === 'location');
      await page.screenshot({ path: outputFile(`variants-${width}.png`) });
      await page.getByRole('region', { name:'Вариант 1', exact:true }).screenshot({path:outputFile(`group-${width}.png`)});
      await page.locator('#editor-tab-shipping').focus(); await page.keyboard.press('ArrowLeft');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'editor-tab-variants');
    }
    await description.fill('Правка перед выходом');
    await form(page).getByRole('button', { name: 'Товары', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/seller/products');
    await page.goto(origin+'/seller/products/501/create'); await ready(page);
    assert.equal(await description.inputValue(), 'Правка перед выходом');
    await page.goto(origin+'/seller/products/400/edit'); await page.locator('dialog[open]').first().waitFor();
    assert.equal(await page.locator('section[data-editor-page]').count(), 0);
    await page.getByRole('button', { name: 'Закрыть редактор', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/seller/products');
    console.log('PASS: 320/390/1280 continuous form and sticky anchors, keyboard navigation, no overflow, save on leave and existing editor dialog');

    await page.goto(origin+'/seller/products/501/create'); await ready(page);
    await page.locator('#editor-tab-photos').click();
    await page.locator('#product-photos input[type=file]').setInputFiles([file]);
    await save(page);
    await page.getByRole('button', { name:'Отправить на модерацию', exact:true }).click();
    await page.getByRole('heading', { name:'Товар отправлен на модерацию', exact:true }).waitFor();
    assert.equal(products.get(501).status, 'MODERATION');
    console.log('PASS: complete form saves photos and submits to moderation through the same editor');

    role = 'ADMIN';
    const admin = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await admin.goto(origin+'/admin?tab=products&status=ALL&productId=501');
    const colorSection = admin.getByText('Цвета для фильтров', { exact: true }); await colorSection.waitFor();

    for (const shade of ['Молочный','Слоновая кость']) {
      const combo = admin.getByRole('combobox', { name: new RegExp('^Базовый цвет: '+shade) });
      await combo.click(); await admin.getByRole('option', { name: 'Белый', exact: true }).click();
      await combo.locator('xpath=../../..').getByRole('button', { name: 'Присвоить', exact: true }).click();
      await admin.waitForFunction(() => !document.querySelector('[data-loading="true"]'));
    }
    assert.equal(products.get(501).colorways.filter(group => group.colorId === 1).length, 2);
    assert.deepEqual(products.get(501).colorways.map(group => group.color), ['Молочный','Слоновая кость']);
    await admin.screenshot({ path: outputFile('admin-colors-1280.png'), fullPage: true });
    assert.deepEqual(errors, []);
    fs.writeFileSync(outputFile('result.json'), JSON.stringify({ passed: true, completedAt: new Date().toISOString(), checks: 'form/autosave/refresh/media-retry/save-on-leave/widths/admin-colors', fixtureOnly: true }, null, 2));
    console.log('PASS: admin assigns one base color to two distinct seller shades without merging them; fixture API only');
  } catch(error) {
    fs.writeFileSync(outputFile('failure.log'), logs);
    if(browser) for(const context of browser.contexts()) for(const page of context.pages()) { console.error(await page.locator('[data-state]').evaluateAll(nodes => nodes.map(node => ({state:node.dataset.state,title:node.title,text:node.textContent})))); await page.screenshot({ path: outputFile('failure.png'), fullPage:true }).catch(()=>{}); }
    throw error;
  } finally {
    fs.writeFileSync(outputFile('calls.json'), JSON.stringify(calls, null, 2));
    if(browser) await browser.close();
    if(process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/PID',String(child.pid),'/T','/F'], {windowsHide:true,stdio:'ignore'}); else child.kill();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
