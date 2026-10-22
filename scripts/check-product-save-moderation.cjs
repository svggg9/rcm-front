/* eslint-disable @typescript-eslint/no-require-imports -- Runs handlers with mocked APIs only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('app/seller/products/[id]/edit/ProductEditPageClient.tsx', 'utf8');
const utilsExports = {};
new Function('exports', ts.transpileModule(fs.readFileSync('app/seller/products/[id]/edit/utils.ts', 'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}}).outputText)(utilsExports);
const ast = ts.createSourceFile('editor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ['saveProduct', 'publishProduct'].includes(node.name?.text)) functions.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const code = ts.transpileModule(functions.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
function setup({ valid = false, dirty = true, failSave = false, stale = false, variantsInput = [], revision = false, failReview = false,
  onboardingStatus = {legalCompleted:true,agreementAccepted:true}, onboardingError = false } = {}) {
  const calls = []; const notifications = []; let validationCalls = 0; let confirmed = false;
  const noop = () => {};
  const context = {
    saving: false, publishing: false, archiving: false, deleting: false, uploading: false, reordering: false, mediaActionPending: false,
    saveRequestRef: {current:false}, publishRequestRef: {current:false}, editRevisionRef: {current:0}, publishSuccessReturnFocusRef: {},
    dirty, product: {status:'DRAFT', revisionSourceId:revision ? 5 : null}, productId: 7, API_URL: '', title:'', description:'', composition:'', categoryId:'', brandId:1,
    suggestedCategoryName:'', audience:'UNISEX', packageWidthCm:'', packageHeightCm:'', packageLengthCm:'', packageWeightKg:'', variants:variantsInput,
    inconsistentColorPriceIndexes: utilsExports.inconsistentColorPriceIndexes,
    canEditProductOperations: () => true, isProductStatusPublishable: () => true,
    setValidationErrors: noop, setSaveSucceeded: noop, setSaving: noop, setDirty: noop, setPublishing: noop,
    setPublishSucceeded: noop, setPublishSuccessOpen: value => { confirmed = value; }, setProduct: noop,
    setRevisionReviewSource: noop, setReviewLoading: noop, reviewRequestRef:{current:false},
    emitSellerNavigationChanged: noop,
    window: {setTimeout:noop}, document:{activeElement:null}, HTMLElement: class {},
    toast:{dismiss:noop, error:message=>notifications.push({type:'error',message}), info:noop,
      success:message=>notifications.push({type:'success',message})}, failValidation:noop, scrollToFirstValidationError:noop,
    validateProduct: () => { validationCalls++; return {valid}; }, onboardingStatus, onboardingError,
    productActionResponseError: async () => 'Ошибка сохранения',
    resolveVariantsForSave: async () => variantsInput, reloadProductState: async () => !stale, numberOrNull: x => x === '' ? null : Number(x),
    apiFetch: async (url, options) => { calls.push({url,...options}); return {ok:!(failSave && options.method === 'PUT') && !failReview, json:async()=>({id:5,status:'ACTIVE'}), status:400, text:async()=> 'Save failed'}; },
  };
  const handlers = new Function(...Object.keys(context), code + '\nreturn {saveProduct,publishProduct};')(...Object.values(context));
  return {...handlers,calls,notifications,validationCalls:()=>validationCalls,confirmed:()=>confirmed};
}
(async () => {
  let test = setup();
  assert.equal(await test.saveProduct(), true);
  assert.equal(test.validationCalls(), 0);
  assert.equal(JSON.parse(test.calls[0].body).title, '');
  assert.equal(JSON.parse(test.calls[0].body).packageWidthCm, null);
  assert.deepEqual(test.notifications, [{type:'success',message:'Товар сохранён'}]);
  test = setup({failSave:true});
  assert.equal(await test.saveProduct(), false);
  assert.deepEqual(test.notifications, [{type:'error',message:'Ошибка сохранения'}]);
  test = setup({stale:true});
  assert.equal(await test.saveProduct(), false);
  assert.deepEqual(test.notifications, [], 'Stale reload must not confirm a saved product');
  test = setup(); await test.publishProduct();
  assert.equal(test.validationCalls(), 1); assert.equal(test.calls.length, 0);
  test = setup({valid:true}); await Promise.all([test.publishProduct(),test.publishProduct()]);
  assert.deepEqual(test.calls.map(c=>c.method), ['PUT','POST']);
  assert.equal(test.confirmed(), true, 'Moderation opens its success dialog');
  assert.deepEqual(test.notifications, [], 'Success dialog must not be obscured by a duplicate toast');
  test = setup({valid:true,failSave:true}); await test.publishProduct();
  assert.deepEqual(test.calls.map(c=>c.method), ['PUT']);
  test = setup({valid:true,stale:true}); await test.publishProduct();
  assert.deepEqual(test.calls.map(c=>c.method), ['PUT']);
  test = setup({valid:true,dirty:false}); await test.publishProduct();
  assert.deepEqual(test.calls.map(c=>c.method), ['POST']);
  for (const status of [null, {legalCompleted:false,agreementAccepted:false}, {legalCompleted:true,agreementAccepted:false}]) {
    test = setup({valid:true,onboardingStatus:status}); await test.publishProduct();
    assert.deepEqual(test.calls.map(c=>c.method), ['PUT','POST'], 'Incomplete or loading store data must not block moderation');
    assert.equal(test.confirmed(), true);
  }
  test = setup({valid:true,onboardingStatus:null,onboardingError:true}); await test.publishProduct();
  assert.deepEqual(test.calls.map(c=>c.method), ['PUT','POST'], 'Readiness GET failure must not block moderation');
  test = setup(); await Promise.all([test.saveProduct(),test.saveProduct()]);
  assert.equal(test.calls.length, 1);
  test = setup({valid:true,revision:true});
  await Promise.all([test.publishProduct(),test.publishProduct()]);
  assert.equal(test.calls.length, 1, 'Review must only read the source, without saving or publishing');
  assert.equal(test.calls[0].url, '/api/seller/products/5');
  test = setup({valid:true,revision:true,failReview:true}); await test.publishProduct();
  assert.equal(test.calls.length, 1, 'Failed comparison must not publish');
  test = setup({valid:true,revision:true}); await test.publishProduct(true);
  assert.deepEqual(test.calls.map(c=>c.method), ['PUT','POST'], 'Confirmed review still saves before publishing');
  test = setup({valid:true,revision:true,onboardingStatus:{legalCompleted:false,agreementAccepted:false}}); await test.publishProduct(true);
  assert.deepEqual(test.calls.map(c=>c.method), ['PUT','POST'], 'Content revision can also be submitted before store readiness');
  const row = {id:31,colorwayId:null,sizeId:'',size:'M',colorId:'',color:'',sku:'SKU-1',
    price:150,initialPrice:100,availableQuantity:10,initialQuantity:10,reservedQuantity:3,
    sellerArticle:'article',initialSellerArticle:'article'};
  test = setup({variantsInput:[row]});
  assert.equal(await test.saveProduct(), true);
  let savedRow = JSON.parse(test.calls[0].body).variants[0];
  assert.equal(savedRow.stockQuantity, null, 'Price-only save must omit unchanged total stock, preserving inventory');
  assert.equal(savedRow.operationalChanged, true);
  test = setup({variantsInput:[{...row,price:100}]});
  await test.saveProduct();
  assert.equal(JSON.parse(test.calls[0].body).variants[0].operationalChanged, false, 'Content-only revision must not overwrite live prices');
  test = setup({variantsInput:[{...row,availableQuantity:12}]});
  await test.saveProduct();
  savedRow = JSON.parse(test.calls[0].body).variants[0];
  assert.equal(savedRow.stockQuantity, 12, 'Explicit stock edit sends total quantity, never available minus reserved');
  console.log('PASS: incomplete save, moderation validation, save-before-publish, failure/stale guards and duplicate protection');
})().catch(error => { console.error(error); process.exitCode = 1; });
